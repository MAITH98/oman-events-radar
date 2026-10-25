import datetime as dt
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from radar import adapters, export, fetch, model  # noqa: E402

D = dt.date
CFG = json.load(open(os.path.join(os.path.dirname(__file__), "..", "sources.json"), encoding="utf-8"))
RULES = CFG["rules"]


def ev(title, start, **kw):
    return model.Event(title, start, **kw)


class Dates(unittest.TestCase):
    def test_formats(self):
        self.assertEqual(model.parse_date("2026-11-02 11:00:00"), D(2026, 11, 2))
        self.assertEqual(model.parse_date("20261028T140000"), D(2026, 10, 28))
        self.assertEqual(model.parse_date("1 Dec", 2026), D(2026, 12, 1))
        self.assertEqual(model.parse_date("February 18-19, 2025"), D(2025, 2, 18))
        self.assertIsNone(model.parse_date("To Be Announced"))
        self.assertIsNone(model.parse_date("31 Feb", 2026))

    def test_dates_in_text(self):
        self.assertEqual(model.find_date_range("Expo on 6-9 Sep 2026"), (D(2026, 9, 6), D(2026, 9, 9)))
        self.assertEqual(model.find_date_range("on November 3, 2026"), (D(2026, 11, 3), None))
        self.assertEqual(model.find_date_range("معرض ١٢ - ١٥ مارس 2026"), (D(2026, 3, 12), D(2026, 3, 15)))
        self.assertEqual(model.find_date_range("no date here"), (None, None))


class Dedupe(unittest.TestCase):
    def test_same_event_different_spelling(self):
        a = ev("COMEX 2026", D(2026, 9, 6), source="ocec", tier="A")
        b = ev("COMEX", D(2026, 9, 6), source="seed", tier="B", url="https://comex")
        [out] = model.dedupe([b, a])
        self.assertEqual(out.url, "https://comex")         # filled from the lower-trust copy
        self.assertEqual(out.sources, ["ocec", "seed"])

    def test_editions_stay_separate(self):
        a = ev("COMEX 2026", D(2026, 9, 6))
        b = ev("COMEX 2027", D(2026, 9, 10))
        self.assertEqual(len(model.dedupe([a, b])), 2)

    def test_rounds_on_different_dates_stay_separate(self):
        a = ev("Oman International Drift Championship (Rounds)", D(2026, 1, 22))
        b = ev("Oman International Drift Championship (Rounds)", D(2026, 2, 5))
        self.assertEqual(len(model.dedupe([a, b])), 2)

    def test_wider_window_needs_same_venue(self):
        a = ev("Project Oman", D(2026, 11, 2), venue="OCEC")
        b = ev("Project Oman", D(2026, 11, 12), venue="OCEC")
        c = ev("Project Oman", D(2026, 11, 12), venue="Sheraton")
        self.assertEqual(len(model.dedupe([a, b])), 1)
        self.assertEqual(len(model.dedupe([a, c])), 2)


class Scoring(unittest.TestCase):
    def test_tech_event_is_high_without_geography_bonus(self):
        e = ev("Enterprise AI Expo", D(2026, 5, 13), venue="Riyadh")
        self.assertEqual(model.score(e, RULES)[1:], ("High", "Tech & AI"))

    def test_marketing_copy_does_not_make_fisheries_tech(self):
        e = ev("IORA Aquaculture & Fisheries Business Forum", D(2026, 12, 1),
               description="innovation, technology and digital solutions for the blue economy")
        self.assertEqual(model.score(e, RULES)[2], "Industry & Energy")

    def test_concert_is_low(self):
        e = ev("Elissa Live in Muscat concert", D(2026, 11, 13), description="innovation and digital stage")
        self.assertEqual(model.score(e, RULES)[1], "Low")

    def test_word_it_does_not_count_as_tech(self):
        e = ev("Comedy night", D(2026, 5, 13), description="Join it for fun")
        self.assertNotEqual(model.score(e, RULES)[2], "Tech & AI")

    def test_region(self):
        self.assertEqual(model.region(ev("X", D(2026, 1, 1), venue="OCEC, Muscat"), CFG["regions"]), "Oman")
        self.assertEqual(model.region(ev("X", D(2026, 1, 1), city="Riyadh"), CFG["regions"]), "GCC")
        self.assertEqual(model.region(ev("X", D(2026, 1, 1), venue="ITC Maratha, Mumbai"), CFG["regions"]), "Other")
        self.assertEqual(model.region(ev("Surgery day", D(2026, 1, 1), venue="Hall 1"), CFG["regions"]), "Other")

    def test_spam_and_always_on_aggregator_listing_excluded(self):
        self.assertTrue(model.excluded(ev("House Shifting loading unloading", D(2027, 4, 1)), RULES))
        self.assertTrue(model.excluded(ev("Webinar", D(2024, 6, 2), end=D(2026, 11, 1), tier="C"), RULES))
        # a long official programme is kept
        self.assertFalse(model.excluded(ev("Muscat Nights", D(2026, 1, 1), end=D(2026, 3, 31), tier="A"), RULES))


class Verification(unittest.TestCase):
    def test_confidence_and_status(self):
        agg = ev("Pitch Night", D(2026, 12, 1), tier="C", sources=["allevents"], tiers=["C"])
        agg.confidence = model.confidence(agg)
        self.assertEqual(model.status(agg, D(2026, 10, 25), 60, 40), "Needs review")
        both = ev("Pitch Night", D(2026, 12, 1), tiers=["B", "C"], sources=["seed", "allevents"])
        both.confidence = model.confidence(both)
        self.assertEqual(model.status(both, D(2026, 10, 25), 60, 40), "Upcoming")

    def test_cancelled(self):
        e = ev("X", D(2026, 12, 1), status_hint="EventCancelled")
        self.assertEqual(model.status(e, D(2026, 10, 25), 60, 40), "Cancelled")
        self.assertEqual(model.post_plan(e, CFG["post_plans"]), {})

    def test_stable_id_survives_reschedule_but_not_new_edition(self):
        first = ev("COMEX", D(2026, 9, 6))
        rid = model.assign_id(first, {})
        known = {rid: {"series": model.series_key("COMEX"), "start": "2026-09-06", "kind": "event"}}
        moved = ev("COMEX", D(2026, 10, 1))
        self.assertEqual(model.assign_id(moved, known), rid)
        self.assertEqual(moved.previous_start, "2026-09-06")
        self.assertNotEqual(model.assign_id(ev("COMEX", D(2027, 9, 5)), known), rid)

    def test_expected_next_edition(self):
        hist = [{"series": "comex", "title": "COMEX 2026", "start": "2026-09-06", "end": "2026-09-09",
                 "relevance": "High"}]
        [nxt] = model.expected_editions(hist, [], D(2026, 10, 25))
        self.assertEqual((nxt.title, nxt.start, nxt.end, nxt.kind), ("COMEX 2027", D(2027, 9, 5), D(2027, 9, 8), "expected"))
        self.assertEqual(model.expected_editions(hist, [ev("COMEX 2027", D(2027, 2, 1))], D(2026, 10, 25)), [])

    def test_workflow_depends_on_relevance(self):
        e = ev("X", D(2026, 11, 30), end=D(2026, 12, 2), relevance="High")
        plan = model.post_plan(e, CFG["post_plans"])
        self.assertEqual((plan["brief"], plan["recap"]), (D(2026, 11, 9), D(2026, 12, 3)))
        e.relevance = "Low"
        self.assertEqual(model.post_plan(e, CFG["post_plans"]), {})


class Parsers(unittest.TestCase):
    def test_ical(self):
        text = ("BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261201\r\nDTEND;VALUE=DATE:20261204\r\n"
                "SUMMARY:Oman AgroFood\\, 2026\r\nURL:https://x\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n")
        [e] = adapters.parse_ical(text, "t")
        self.assertEqual((e.title, e.start, e.end), ("Oman AgroFood, 2026", D(2026, 12, 1), D(2026, 12, 3)))

    def test_jsonld_nested_status_and_organizer(self):
        page = ('<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"item":'
                '{"@type":"BusinessEvent","name":"Pitch Night","startDate":"2026-11-10T18:00",'
                '"eventStatus":"https://schema.org/EventPostponed",'
                '"organizer":{"name":"Org","url":"https://org.example"},'
                '"location":{"name":"KOM","address":{"addressLocality":"Muscat"}},'
                '"offers":{"price":"5","priceCurrency":"OMR"}}}]}</script>')
        [e] = adapters.parse_jsonld(page, "t")
        self.assertEqual((e.title, e.venue, e.city, e.ticket_price, e.status_hint, e.organizer_url),
                         ("Pitch Night", "KOM", "Muscat", "5 OMR", "EventPostponed", "https://org.example"))

    def test_broken_rss_falls_back_and_keeps_undated(self):
        feed = ('<rss><channel><item><title>Oman Expo 2-4 Dec 2026</title><x:y>bad</x:y><link>https://n</link></item>'
                '<item><title>Registration opens for Oman AI Summit</title><link>https://m</link></item></channel></rss>')
        out = adapters._rss_items(feed, {"name": "n"}, ["expo", "summit"])
        self.assertEqual([(e.title, e.start) for e in out],
                         [("Oman Expo 2-4 Dec 2026", D(2026, 12, 2)), ("Registration opens for Oman AI Summit", None)])

    def test_page_watch_lines(self):
        class F:
            def get(self, url):
                return ("<html><body><h3>Oman Design &amp; Build Week</h3><p>19 - 21 April 2027</p>"
                        "<li>Oman Petroleum &amp; Energy Show 26-28 April 2027</li><script>var x='1 Jan 2030'</script></body></html>")
        src = {"name": "connect", "url": "https://connect.example/"}
        out = adapters.page_watch(F(), src)
        self.assertEqual([(e.title, e.start, e.end) for e in out],
                         [("Oman Design & Build Week", D(2027, 4, 19), D(2027, 4, 21)),
                          ("Oman Petroleum & Energy Show", D(2027, 4, 26), D(2027, 4, 28))])
        self.assertTrue(src["_hash"])

    def test_page_watch_skips_place_and_button_titles(self):
        class F:
            def get(self, url):
                return ("<p>Muscat, Oman</p><p>Muscat, Oman 18 April 2027</p><p>VISIT WEBSITE 18 April 2027</p>"
                        "<p>08:00 AM 5 Oct 2027</p><p>INDUSTRY NEWS</p><p>5 Oct 2027</p>")
        self.assertEqual(adapters.page_watch(F(), {"name": "x", "url": "https://x.example/"}), [])


class Security(unittest.TestCase):
    def test_ssrf_guard(self):
        for bad in ("http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data",
                    "http://10.0.0.5/", "file:///etc/passwd", "ftp://example.com/", "http://user:pw@example.com/",
                    "http://[::1]/"):
            with self.assertRaises(fetch.UnsafeURL, msg=bad):
                fetch.check_public(bad)


class Export(unittest.TestCase):
    def test_ics_folds_utf8_safely(self):
        out = export._ics("t", [("1", D(2026, 1, 1), D(2026, 1, 1), "معرض " * 40, "", "", "", False)],
                          "20260101T000000Z")
        for line in out.split("\r\n"):
            self.assertLessEqual(len(line.encode()), 75)

    def test_change_entry_contract(self):
        rec = {"id": "abc", "version": 3}
        c = export.change(7, "event.updated", rec, "2026-10-25T03:00:00+00:00")
        self.assertEqual((c["sequence"], c["idempotency_key"], c["schema_version"]),
                         (7, "abc:3:event.updated", export.SCHEMA_VERSION))


if __name__ == "__main__":
    unittest.main()
