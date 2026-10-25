"""Polite, defensive HTTP fetching.

* honours robots.txt and per-host crawl delays
* only http/https, only public IP addresses (SSRF guard), re-checked on every redirect
* response size cap, cookies kept per run (some sites redirect through a cookie check)
"""

import http.cookiejar
import ipaddress
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

USER_AGENT = "OmanEventsRadar/0.2 (+https://github.com/MAITH98/oman-events-radar)"
MAX_BYTES = 5 * 1024 * 1024


class Blocked(Exception):
    """Raised when robots.txt does not allow a URL."""


class UnsafeURL(Exception):
    """Raised for non-http(s) URLs or hosts that resolve to private/internal addresses."""


def check_public(url):
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise UnsafeURL(url)
    if parts.username or parts.password:
        raise UnsafeURL(url)
    try:
        infos = socket.getaddrinfo(parts.hostname, parts.port or (443 if parts.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise urllib.error.URLError(exc)
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if not ip.is_global or ip.is_multicast:
            raise UnsafeURL(f"{url} resolves to non-public address {ip}")


def _ascii_url(url):
    """Percent-encode non-ASCII paths (e.g. Arabic event slugs) so urllib can send them."""
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(parts._replace(
        netloc=parts.netloc.encode("idna").decode(),
        path=urllib.parse.quote(parts.path, safe="/%:@!$&'()*+,;="),
        query=urllib.parse.quote(parts.query, safe="=&%+/:,;@!$'()*")))


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        newurl = _ascii_url(urllib.parse.urljoin(req.full_url, newurl))
        check_public(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Fetcher:
    def __init__(self, min_delay=2.0, timeout=25):
        self.min_delay = min_delay
        self.timeout = timeout
        self._robots = {}
        self._last_hit = {}
        self._opener = urllib.request.build_opener(
            _SafeRedirect(), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def _robots_for(self, url):
        parts = urllib.parse.urlsplit(url)
        host = f"{parts.scheme}://{parts.netloc}"
        if host not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                rp.parse(self._raw_get(host + "/robots.txt").splitlines())
            except urllib.error.HTTPError as exc:
                # Same convention as Python's robotparser: 401/403 = disallow all, other errors = allow.
                rp.parse(["User-agent: *", "Disallow: /"] if exc.code in (401, 403) else [])
            except UnsafeURL:
                raise
            except Exception:
                rp.parse([])
            self._robots[host] = rp
        return host, self._robots[host]

    def _raw_get(self, url):
        url = _ascii_url(url)
        check_public(url)
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/json,text/calendar,application/rss+xml,*/*",
            "Accept-Language": "en,ar;q=0.8",
        })
        with self._opener.open(req, timeout=self.timeout) as resp:
            body = resp.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError(f"response larger than {MAX_BYTES} bytes")
            charset = resp.headers.get_content_charset() or "utf-8"
            return body.decode(charset, errors="replace")

    def get(self, url):
        host, rp = self._robots_for(url)
        if not rp.can_fetch(USER_AGENT, url):
            raise Blocked(url)
        delay = max(self.min_delay, float(rp.crawl_delay(USER_AGENT) or 0))
        wait = self._last_hit.get(host, 0) + delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        try:
            try:
                return self._raw_get(url)
            except (TimeoutError, socket.timeout):
                # Slow sites (seen with OCEC from overseas runners): one retry with double the timeout.
                self.timeout, original = self.timeout * 2, self.timeout
                try:
                    return self._raw_get(url)
                finally:
                    self.timeout = original
        finally:
            self._last_hit[host] = time.monotonic()
