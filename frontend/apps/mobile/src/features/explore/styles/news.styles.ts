import { palette } from "../../../theme/palette";
import { rs } from "../../../utils/responsive";
import { StyleSheet } from "react-native";
import { Colors } from "../../../theme/colors";

// ── News Styles ─────────────────────────────────────────
export const nw = StyleSheet.create({
  // Hero
  hero: { paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(14), marginTop: rs(4) },
  heroInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLeft: { flex: 1, gap: rs(4) },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: rs(6), alignSelf: "flex-start", backgroundColor: palette.red100, borderRadius: rs(999), paddingHorizontal: rs(10), paddingVertical: rs(4), marginBottom: rs(4) },
  heroDot: { width: rs(7), height: rs(7), borderRadius: rs(4), backgroundColor: palette.red500 },
  heroBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.red600, letterSpacing: 1.2 },
  heroTitle: { fontSize: rs(24), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary, marginTop: rs(2) },
  heroRight: { flexDirection: "row", alignItems: "center", gap: rs(12), backgroundColor: palette.white, borderRadius: rs(16), paddingHorizontal: rs(16), paddingVertical: rs(12), borderWidth: 1, borderColor: palette.skyL94_6, shadowColor: palette.black, shadowOpacity: 0.04, shadowRadius: rs(6), elevation: 2 },
  heroStat: { alignItems: "center", gap: rs(2) },
  heroStatNum: { fontSize: rs(18), fontWeight: "900", color: Colors.text.primary },
  heroStatLabel: { fontSize: rs(9), fontWeight: "800", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.6 },
  heroStatDiv: { width: rs(1), height: rs(28), backgroundColor: palette.skyL94_6 },
  heroUpdated: { fontSize: rs(11), fontWeight: "600", color: Colors.text.tertiary, marginTop: rs(8) },

  // Category pills
  catRow: { paddingHorizontal: rs(6), paddingVertical: rs(8), paddingBottom: rs(14), gap: rs(6) },
  catPill: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: palette.white, borderRadius: rs(999), paddingHorizontal: rs(11), paddingVertical: rs(6), borderWidth: 1, borderColor: palette.skyL94_6, shadowColor: palette.brandBlue, shadowOpacity: 0.06, shadowRadius: rs(4), elevation: 1 },
  catPillActive: { backgroundColor: Colors.brand.blue, borderColor: Colors.brand.blue, shadowOpacity: 0.2, elevation: 3 },
  catEmoji: { fontSize: rs(11) },
  catText: { fontSize: rs(11), fontWeight: "800", color: Colors.text.secondary },
  catTextActive: { color: palette.white },

  // Loading
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: rs(24), gap: rs(12), paddingHorizontal: rs(14) },
  loadingText: { fontSize: rs(14), fontWeight: "600", color: Colors.text.tertiary },
  newsSkeletonCard: { width: "100%", height: rs(230), borderRadius: rs(18), borderWidth: 1 },

  // Error
  errorWrap: { alignItems: "center", justifyContent: "center", paddingVertical: rs(60), paddingHorizontal: rs(24), gap: rs(6) },
  errorTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  errorSub: { fontSize: rs(13), fontWeight: "600", color: Colors.text.tertiary },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: rs(8), backgroundColor: Colors.brand.blue, borderRadius: rs(999), paddingHorizontal: rs(20), paddingVertical: rs(10), marginTop: rs(14) },
  retryText: { fontSize: rs(13), fontWeight: "800", color: palette.white },

  // Featured card
  featuredCard: { borderRadius: rs(20), overflow: "hidden", height: rs(260), marginBottom: rs(8), shadowColor: palette.black, shadowOpacity: 0.1, shadowRadius: rs(12), elevation: 4 },
  featuredImg: { width: "100%", height: "100%" },
  featuredOverlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: rs(18) },
  featuredBadge: {
    position: "absolute", top: rs(10), left: rs(10),
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: Colors.brand.blue, borderRadius: rs(8),
    paddingHorizontal: rs(10), paddingVertical: rs(5),
  },
  featuredBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.white, letterSpacing: 0.6 },
  featuredTitle: { fontSize: rs(19), fontWeight: "900", color: palette.white, lineHeight: rs(26), marginBottom: rs(8), textShadowColor: "rgba(0,0,0,0.3)", textShadowRadius: 4 },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: rs(8) },
  featuredSource: { fontSize: rs(12), fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  featuredDot: { width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: "rgba(255,255,255,0.5)" },
  featuredTime: { fontSize: rs(12), fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  // Article card
  articleCard: { flexDirection: "row", backgroundColor: palette.white, borderRadius: rs(16), marginBottom: rs(10), borderWidth: 1, borderColor: palette.neutralL94_2, overflow: "hidden", shadowColor: palette.black, shadowOpacity: 0.03, shadowRadius: rs(6), elevation: 1 },
  articleBody: { flex: 1, padding: rs(14), gap: rs(6), justifyContent: "center" },
  articleSourceRow: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  sourceDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: Colors.brand.blue },
  articleSource: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue, flex: 1 },
  articleTime: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary },
  articleTitle: { fontSize: rs(14), fontWeight: "800", color: Colors.text.primary, lineHeight: rs(20) },
  articleDesc: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary, lineHeight: rs(17) },
  articleFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: rs(2) },
  articleCatPill: { backgroundColor: palette.neutralL97_3, borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) },
  articleCatText: { fontSize: rs(10), fontWeight: "700", color: Colors.text.secondary },
  articleThumb: { width: rs(110), height: "100%", minHeight: 110 },

  // Empty filter
  emptyFilter: { alignItems: "center", justifyContent: "center", paddingVertical: rs(50), gap: rs(8) },
  emptyFilterTitle: { fontSize: rs(16), fontWeight: "800", color: Colors.text.primary },
  emptyFilterSub: { fontSize: rs(13), fontWeight: "600", color: Colors.text.tertiary },

  // ── Section structure (two-section layout) ──
  sectionBlock: { paddingHorizontal: rs(16), marginTop: rs(4) },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: rs(12), marginBottom: rs(14), paddingVertical: rs(8) },
  sectionIconWrap: { width: rs(40), height: rs(40), borderRadius: rs(12), backgroundColor: palette.blueL97, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: rs(17), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: rs(12), fontWeight: "600", color: Colors.text.tertiary, marginTop: rs(1) },
  sectionCreateBtn: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: Colors.brand.blue, borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  sectionCreateBtnText: { fontSize: rs(12), fontWeight: "800", color: palette.white },
  sectionDivider: { height: rs(8), backgroundColor: palette.neutralL96_5, marginVertical: rs(8) },

  // ── News Card ──
  newsCard: { backgroundColor: palette.white, borderRadius: rs(16), marginHorizontal: rs(6), marginBottom: rs(10), borderWidth: 1, borderColor: palette.neutralL94_2, shadowColor: palette.brandBlue, shadowOpacity: 0.07, shadowRadius: rs(10), shadowOffset: { width: 0, height: rs(3) }, elevation: 3, overflow: "hidden" },
  newsCardInner: { flexDirection: "row" },
  newsAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: rs(4) },
  newsCardImg: { width: "100%", height: rs(105) },
  newsCardBody: { flex: 1, paddingVertical: rs(14), paddingRight: rs(14), paddingLeft: rs(14), gap: rs(8) },
  newsCardAccent: { height: rs(3), width: "100%" },
  newsTopRow: { flexDirection: "row", alignItems: "center", gap: rs(6), flexWrap: "wrap" },
  newsCardSourceRow: { flexDirection: "row", alignItems: "center", gap: rs(5), flex: 1 },
  newsCardSource: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue, flex: 1 },
  newsCardTime: { fontSize: rs(10), fontWeight: "600", color: Colors.text.tertiary },
  newsCardTitle: { fontSize: rs(15), fontWeight: "800", color: Colors.text.primary, lineHeight: rs(22), letterSpacing: -0.3 },
  newsCardTitleFeatured: { fontSize: rs(17), lineHeight: rs(25) },
  newsCardDesc: { fontSize: rs(13), fontWeight: "400", color: Colors.text.secondary, lineHeight: rs(20) },
  newsCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: rs(4) },
  newsCardReadMore: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  newsCardReadMoreText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // ── Featured overlay card (top story) ──
  newsFeaturedCard: { borderRadius: rs(20), overflow: "hidden", height: rs(280), marginHorizontal: rs(6), marginBottom: rs(14), shadowColor: palette.black, shadowOpacity: 0.14, shadowRadius: rs(16), elevation: 6 },
  newsFeaturedOverlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: rs(16) },
  newsFeaturedTopBadge: { position: "absolute", top: rs(12), left: rs(12), flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: Colors.brand.blue, borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  newsFeaturedTopBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.white, letterSpacing: 0.6 },
  newsFeaturedTitle: { fontSize: rs(21), fontWeight: "900", color: palette.white, lineHeight: rs(28), marginBottom: rs(8), textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4 },
  newsFeaturedMeta: { flexDirection: "row", alignItems: "center", gap: rs(7) },
  newsFeaturedSource: { fontSize: rs(12), fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  newsFeaturedDot: { width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: "rgba(255,255,255,0.45)" },
  newsFeaturedTime: { fontSize: rs(12), fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  newsFeaturedActions: { flexDirection: "row", alignItems: "center", gap: rs(14), marginTop: rs(12), paddingTop: rs(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.22)" },
  newsFeaturedAction: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  newsFeaturedActionText: { fontSize: rs(13), fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  // ── News card badges & enhancements ──
  readOverlay: {
    position: "absolute", bottom: rs(8), left: rs(8),
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  readOverlayText: { fontSize: rs(10), fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  trendingBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: palette.red500, borderRadius: rs(10),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
    alignSelf: "flex-start",
  },
  trendingBadgeText: { fontSize: rs(9), fontWeight: "900", color: palette.white, letterSpacing: 0.4 },
  readTimeChip: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    backgroundColor: palette.neutralL96_5, borderRadius: rs(6),
    paddingHorizontal: rs(6), paddingVertical: rs(2),
  },
  readTimeText: { fontSize: rs(9), fontWeight: "700", color: Colors.text.tertiary },
  readBadge: {
    backgroundColor: palette.green100, borderRadius: rs(6),
    paddingHorizontal: rs(6), paddingVertical: rs(2),
    borderWidth: 1, borderColor: palette.green200,
  },
  readBadgeText: { fontSize: rs(9), fontWeight: "900", color: palette.green600, letterSpacing: 0.5 },

  // ── Sub-tab bar (Community / Live) ──
  subTabBar: { flexDirection: "row", marginHorizontal: rs(16), marginTop: rs(4), marginBottom: rs(2), backgroundColor: palette.neutralL96, borderRadius: rs(12), padding: rs(3) },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(5), paddingVertical: rs(8), borderRadius: rs(10) },
  subTabActive: { backgroundColor: Colors.brand.blue, shadowColor: Colors.brand.blue, shadowOpacity: 0.25, shadowRadius: rs(6), elevation: 3 },
  subTabText: { fontSize: rs(12), fontWeight: "800", color: Colors.text.secondary },
  subTabTextActive: { color: palette.white },
  liveDotSmall: { width: rs(7), height: rs(7), borderRadius: rs(3.5), backgroundColor: palette.red500 },

  // ── Live news info strip ──
  liveInfoStrip: { flexDirection: "row", alignItems: "center", gap: rs(7), paddingHorizontal: rs(16), paddingVertical: rs(10), marginBottom: rs(2) },
  liveInfoBadge: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: palette.red500, borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4) },
  liveInfoDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: "rgba(255,255,255,0.85)" },
  liveInfoBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.white, letterSpacing: 0.5 },
  liveInfoChunk: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  liveInfoSepDot: { width: rs(3), height: rs(3), borderRadius: rs(1.5), backgroundColor: palette.gray300 },
  liveRefreshBtn: { marginLeft: "auto" as any, width: rs(30), height: rs(30), borderRadius: rs(10), backgroundColor: Colors.brand.blueLight, alignItems: "center", justifyContent: "center" },
  phaseTwoLoaderWrap: { paddingHorizontal: rs(16), paddingTop: rs(2), paddingBottom: rs(8) },
  phaseTwoLoaderTrack: {
    height: rs(3),
    width: "100%",
    borderRadius: rs(999),
    backgroundColor: palette.gray200,
    overflow: "hidden",
  },
  phaseTwoLoaderBar: { width: "42%", height: "100%", backgroundColor: Colors.brand.blue },
  phaseTwoLoaderText: { marginTop: rs(5), fontSize: rs(11), fontWeight: "600" },
  paginationFooter: { alignItems: "center", paddingBottom: rs(14), paddingTop: rs(4), gap: rs(8) },
  paginationText: { fontSize: rs(12), fontWeight: "600" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    backgroundColor: Colors.brand.blue,
    borderRadius: rs(999),
    paddingHorizontal: rs(18),
    paddingVertical: rs(10),
  },
  loadMoreBtnText: { fontSize: rs(12), fontWeight: "800", color: palette.white },

  // ── Expand button ──
  expandBtn: { flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(2) },
  expandBtnText: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.blue },

  // ── News card interaction bar ──
  newsActions: { flexDirection: "row", gap: rs(18), marginTop: rs(10), paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.neutralL94_2, alignItems: "center" },
  newsAction: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  newsActionText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },

  // ── Full details button ──
  fullDetailsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(6), marginTop: rs(10), paddingVertical: rs(12), backgroundColor: Colors.brand.blue, borderRadius: rs(12) },
  fullDetailsBtnText: { fontSize: rs(13), fontWeight: "800", color: palette.white },

  // ── Article Detail Modal ──
  modalRoot: { flex: 1, backgroundColor: palette.white },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: rs(12), paddingTop: rs(50), paddingBottom: rs(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL94_2, backgroundColor: palette.white },
  modalBackBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), alignItems: "center", justifyContent: "center", backgroundColor: palette.neutralL96 },
  modalHeaderTitle: { fontSize: rs(16), fontWeight: "800", color: Colors.text.primary, flex: 1, textAlign: "center", marginHorizontal: rs(8) },
  modalShareBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), alignItems: "center", justifyContent: "center", backgroundColor: palette.neutralL96 },
  modalScroll: { paddingBottom: rs(60) },
  modalHeroImg: { width: "100%", height: rs(240) },
  modalBody: { padding: rs(20), gap: rs(6) },
  modalTitle: { fontSize: rs(22), fontWeight: "900", color: Colors.text.primary, lineHeight: rs(30), letterSpacing: -0.3 },
  modalMeta: { flexDirection: "row", alignItems: "center", gap: rs(6), marginTop: rs(4) },
  modalSource: { fontSize: rs(13), fontWeight: "800", color: Colors.brand.blue },
  modalTime: { fontSize: rs(13), fontWeight: "600", color: Colors.text.tertiary },
  modalDivider: { height: rs(1), backgroundColor: palette.neutralL94_2, marginVertical: rs(16) },
  modalContent: { fontSize: rs(16), fontWeight: "500", color: Colors.text.primary, lineHeight: rs(26) },
  modalContentNote: { flexDirection: "row", alignItems: "flex-start", gap: rs(8), marginTop: rs(16), padding: rs(14), backgroundColor: palette.neutralL98_4, borderRadius: rs(12) },
  modalContentNoteText: { flex: 1, fontSize: rs(13), fontWeight: "600", color: Colors.text.tertiary, lineHeight: rs(19) },
  modalSourceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(8), marginTop: rs(20), paddingVertical: rs(14), backgroundColor: Colors.brand.blue, borderRadius: rs(14) },
  modalSourceBtnText: { fontSize: rs(14), fontWeight: "800", color: palette.white },
  modalActions: { flexDirection: "row", justifyContent: "space-around", marginTop: rs(24), paddingTop: rs(16), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.neutralL94_2 },
  modalActionBtn: { alignItems: "center", gap: rs(6), paddingVertical: rs(8), paddingHorizontal: rs(16) },
  modalActionLabel: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  commentsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  commentsSheet: { borderTopLeftRadius: rs(18), borderTopRightRadius: rs(18), maxHeight: "75%", minHeight: 360 },
  commentsHeader: { flexDirection: "row", alignItems: "center", gap: rs(12), justifyContent: "space-between", paddingHorizontal: rs(16), paddingVertical: rs(12), borderBottomWidth: StyleSheet.hairlineWidth },
  commentsTitle: { flex: 1, fontSize: rs(14), fontWeight: "800" },
  commentsLoadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: rs(10), minHeight: 160 },
  commentsList: { paddingHorizontal: rs(14) },
  commentRow: { flexDirection: "row", gap: rs(10), paddingVertical: rs(10), borderBottomWidth: StyleSheet.hairlineWidth },
  commentAvatar: { width: rs(30), height: rs(30), borderRadius: rs(15) },
  commentAuthor: { fontSize: rs(12), fontWeight: "700" },
  commentText: { fontSize: rs(13), lineHeight: rs(18), marginTop: rs(2) },
  commentTime: { fontSize: rs(11), marginTop: rs(3) },
  commentsInputRow: { flexDirection: "row", gap: rs(8), padding: rs(12), borderTopWidth: StyleSheet.hairlineWidth, alignItems: "center" },
  commentsInput: { flex: 1, borderWidth: 1, borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(10), fontSize: rs(14) },
  commentsSendBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: Colors.brand.blue, alignItems: "center", justifyContent: "center" },
  commentErr: { paddingHorizontal: rs(14), paddingBottom: rs(6), fontSize: rs(12), fontWeight: "600" },
});
