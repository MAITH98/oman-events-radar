/**
 * The map's "go to" list: every governorate (simplemaps region id → its outline's bounding box in omanSvg.ts) with its
 * main wilayats / cities. City coordinates are approximate town centres, used only to fly the map there (not to place
 * events — venues have their own surveyed coordinates in places.ts).
 */
export interface AreaCity {
  key: string;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
}
export interface AreaGovernorate {
  /** simplemaps region id (OMxx) */
  id: string;
  name: string;
  nameAr: string;
  cities: AreaCity[];
}

const c = (key: string, name: string, nameAr: string, lat: number, lon: number): AreaCity => ({ key, name, nameAr, lat, lon });

export const AREAS: AreaGovernorate[] = [
  { id: "OMMA", name: "Muscat", nameAr: "مسقط", cities: [
    c("muscat", "Muscat", "مسقط", 23.613, 58.593), c("muttrah", "Muttrah", "مطرح", 23.62, 58.565), c("bawshar", "Bawshar", "بوشر", 23.577, 58.399),
    c("seeb", "Seeb", "السيب", 23.67, 58.19), c("amerat", "Al Amerat", "العامرات", 23.523, 58.497), c("qurayyat", "Qurayyat", "قريات", 23.26, 58.92),
  ] },
  { id: "OMBA", name: "Al Batinah North", nameAr: "شمال الباطنة", cities: [
    c("sohar", "Sohar", "صحار", 24.347, 56.709), c("shinas", "Shinas", "شناص", 24.743, 56.465), c("liwa", "Liwa", "لوى", 24.53, 56.565),
    c("saham", "Saham", "صحم", 24.172, 56.888), c("khaburah", "Al Khaburah", "الخابورة", 23.972, 57.093), c("suwaiq", "Suwaiq", "السويق", 23.849, 57.438),
  ] },
  { id: "OMBJ", name: "Al Batinah South", nameAr: "جنوب الباطنة", cities: [
    c("rustaq", "Rustaq", "الرستاق", 23.39, 57.424), c("barka", "Barka", "بركاء", 23.679, 57.886), c("musanaah", "Al Musanaah", "المصنعة", 23.77, 57.62),
    c("nakhal", "Nakhal", "نخل", 23.394, 57.829), c("awabi", "Al Awabi", "العوابي", 23.303, 57.527), c("maawil", "Wadi Al Maawil", "وادي المعاول", 23.45, 57.68),
  ] },
  { id: "OMDA", name: "Ad Dakhiliyah", nameAr: "الداخلية", cities: [
    c("nizwa", "Nizwa", "نزوى", 22.933, 57.531), c("bahla", "Bahla", "بهلاء", 22.966, 57.297), c("samail", "Samail", "سمائل", 23.304, 57.98),
    c("izki", "Izki", "إزكي", 22.933, 57.767), c("adam", "Adam", "أدم", 22.378, 57.528), c("hamra", "Al Hamra", "الحمراء", 23.115, 57.29),
    c("manah", "Manah", "منح", 22.8, 57.6), c("bidbid", "Bidbid", "بدبد", 23.41, 58.13),
  ] },
  { id: "OMZA", name: "Ad Dhahirah", nameAr: "الظاهرة", cities: [
    c("ibri", "Ibri", "عبري", 23.226, 56.516), c("yanqul", "Yanqul", "ينقل", 23.586, 56.54), c("dhank", "Dhank", "ضنك", 23.548, 56.257),
  ] },
  { id: "OMBU", name: "Al Buraimi", nameAr: "البريمي", cities: [
    c("buraimi", "Al Buraimi", "البريمي", 24.25, 55.79), c("mahdah", "Mahdah", "محضة", 24.4, 55.97), c("sunaynah", "As Sunaynah", "السنينة", 23.67, 55.95),
  ] },
  { id: "OMMU", name: "Musandam", nameAr: "مسندم", cities: [
    c("khasab", "Khasab", "خصب", 26.18, 56.25), c("dibba", "Dibba", "دبا", 25.62, 56.27), c("bukha", "Bukha", "بخا", 26.14, 56.15), c("madha", "Madha", "مدحاء", 25.28, 56.33),
  ] },
  { id: "OMSS", name: "Ash Sharqiyah North", nameAr: "شمال الشرقية", cities: [
    c("ibra", "Ibra", "إبراء", 22.69, 58.53), c("mudhaibi", "Al Mudhaibi", "المضيبي", 22.57, 58.12), c("bidiyah", "Bidiyah", "بدية", 22.45, 58.8),
    c("qabil", "Al Qabil", "القابل", 22.58, 58.67), c("bani-khalid", "Wadi Bani Khalid", "وادي بني خالد", 22.62, 59.1),
  ] },
  { id: "OMSH", name: "Ash Sharqiyah South", nameAr: "جنوب الشرقية", cities: [
    c("sur", "Sur", "صور", 22.567, 59.529), c("jbb-ali", "Jaalan Bani Bu Ali", "جعلان بني بو علي", 22.02, 59.33),
    c("jbb-hassan", "Jaalan Bani Bu Hassan", "جعلان بني بو حسن", 22.07, 59.28), c("kamil", "Al Kamil wal Wafi", "الكامل والوافي", 22.2, 59.2),
    c("masirah", "Masirah", "مصيرة", 20.68, 58.87),
  ] },
  { id: "OMWU", name: "Al Wusta", nameAr: "الوسطى", cities: [
    c("haima", "Haima", "هيما", 19.96, 56.28), c("duqm", "Duqm", "الدقم", 19.66, 57.7), c("mahout", "Mahout", "محوت", 20.55, 58.17), c("jazer", "Al Jazer", "الجازر", 18.9, 56.95),
  ] },
  { id: "OMZU", name: "Dhofar", nameAr: "ظفار", cities: [
    c("salalah", "Salalah", "صلالة", 17.019, 54.089), c("taqah", "Taqah", "طاقة", 17.04, 54.4), c("mirbat", "Mirbat", "مرباط", 16.99, 54.69),
    c("thumrait", "Thumrait", "ثمريت", 17.67, 54.03), c("sadah", "Sadah", "سدح", 17.05, 55.06), c("rakhyut", "Rakhyut", "رخيوت", 16.74, 53.42),
    c("dhalkut", "Dhalkut", "ضلكوت", 16.7, 53.25), c("mazyunah", "Al Mazyunah", "المزيونة", 17.85, 52.65),
  ] },
];
