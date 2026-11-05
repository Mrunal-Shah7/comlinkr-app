import { StyleSheet } from "react-native";
import { Colors } from "../../../theme/colors";

export const s = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────
  // Screen
  // ─────────────────────────────────────────────────────────────
  safe: { flex: 1, backgroundColor: "#F4F7FC" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ─────────────────────────────────────────────────────────────
  // Hero
  // ─────────────────────────────────────────────────────────────
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: "hidden",
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroDecor1: { display: "none" },
  heroDecor2: { display: "none" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.brand.blue,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 12.5,
    color: Colors.text.secondary,
    marginTop: 3,
    fontWeight: "500",
  },

  // ─────────────────────────────────────────────────────────────
  // Tab Switcher
  // ─────────────────────────────────────────────────────────────
  tabSwitcherWrap: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#EEF2F8",
    borderRadius: 12,
    padding: 3,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "50%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.tertiary,
  },
  tabBtnTextActive: {
    color: Colors.brand.blue,
    fontWeight: "800",
  },

  // ─────────────────────────────────────────────────────────────
  // Roommates Sub-tabs
  // ─────────────────────────────────────────────────────────────
  rmSubTabWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#F0F3F8",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  rmSubTab: {
    flex: 1,
    borderRadius: 13,
    overflow: "hidden",
  },
  rmSubTabActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  rmSubTabGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 13,
  },
  rmSubTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.tertiary,
  },
  rmSubTabTextActive: {
    color: "#FFF",
    fontWeight: "800",
  },
  rmSubTabCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  rmSubTabCountText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // ─────────────────────────────────────────────────────────────
  // Match Info Banner
  // ─────────────────────────────────────────────────────────────
  matchInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F5F8FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E4EBF8",
  },
  matchInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  matchInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  matchInfoSub: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 1,
    lineHeight: 15,
  },

  // ─────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 0,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE6F4",
    paddingHorizontal: 14,
    height: 44,
    shadowColor: "#0A2540",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: "600",
  },

  // ─────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────
  filterScroll: { marginTop: 12, marginBottom: 0 },
  filterChip: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#DDE6F4",
    shadowColor: "#0A2540",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.brand.blue,
    borderColor: Colors.brand.blue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text.secondary,
  },
  filterTextActive: { color: "#FFF" },

  listingsResultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    gap: 12,
  },
  addListingFab: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  addListingFabGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  resultCount: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.text.tertiary,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ─────────────────────────────────────────────────────────────
  // Card Shell
  // ─────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: "#FFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6EEF9",
    shadowColor: "#0A2540",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardFeatured: {
    borderColor: "#D5E8FF",
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },

  // ─────────────────────────────────────────────────────────────
  // Card Image Overlays (Premium)
  // ─────────────────────────────────────────────────────────────
  saveBurst: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  imageScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  scrimBadgeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 2,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.9,
  },
  availNowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  availNowText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  imagePrice: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.7,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  imagePriceNote: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.82)",
  },
  imageLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageLocationText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "700",
    flex: 1,
  },
  cardTopLeft: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  cardTopRight: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  featuredText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#92400E",
  },
  newBadge: {
    backgroundColor: "#257A86",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.6,
  },
  imgCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imgCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF",
  },
  saveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  // ── Carousel dots (bottom-right corner) ──
  dotsRow: {
    position: "absolute",
    bottom: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  dotActive: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },

  // ─────────────────────────────────────────────────────────────
  // Card Body
  // ─────────────────────────────────────────────────────────────
  cardBody: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },

  // ── Landlord bar (top of card body) ──
  landlordBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF2F8",
  },
  landlordInfo: { flex: 1, minWidth: 0, overflow: "hidden" },
  landlordNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  landlordMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  landlordDot: { fontSize: 10, color: "#D1D5DB", fontWeight: "700" },
  landlordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.text.primary,
    letterSpacing: -0.3,
    flexShrink: 1,
    lineHeight: 22,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 1,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.brand.green,
    letterSpacing: 0.2,
  },

  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  depositPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E5EBF4",
  },
  depositText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: "700",
  },
  availImmediatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  availDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16A34A",
  },
  availImmediateText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
  },
  availDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.brand.blueLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#D6E8FF",
  },
  availDateText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.brand.blue,
  },

  // ─────────────────────────────────────────────────────────────
  // Stats Grid (cleaner)
  // ─────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    marginBottom: 14,
    backgroundColor: "#F8FAFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4EBF8",
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  statCell: { flex: 1, alignItems: "center", gap: 6 },
  statCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#D4DFF0",
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statVal: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // ─────────────────────────────────────────────────────────────
  // Walk + Transit
  // ─────────────────────────────────────────────────────────────
  transportRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  transportPill: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  transportPillText: { fontSize: 12, fontWeight: "900" },

  // ─────────────────────────────────────────────────────────────
  // Amenity Chips
  // ─────────────────────────────────────────────────────────────
  tagsRowCard: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E3F1EA",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#CFF5CF",
  },
  tagChipMore: { backgroundColor: Colors.brand.blueLight, borderColor: "#D6E8FF" },
  tagChipText: { fontSize: 11, fontWeight: "800", color: Colors.brand.green },

  // ─────────────────────────────────────────────────────────────
  // Landlord + Actions (inline at top of card body)
  // ─────────────────────────────────────────────────────────────
  landlordAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  landlordInitialsSmall: { fontSize: 13, fontWeight: "900", color: "#FFF" },
  landlordNameSmall: { fontSize: 13, fontWeight: "800", color: Colors.text.primary },
  landlordRatingSmall: { fontSize: 11, fontWeight: "800", color: "#F59E0B" },
  landlordResponseSmall: { fontSize: 10, color: Colors.text.tertiary, fontWeight: "700" },

  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.brand.blue,
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },

  shareBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#B8D4F8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0EDFF",
  },
  reportBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },

  // ── View Details CTA ──
  viewDetailsCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#F0F6FF",
    borderWidth: 1,
    borderColor: "#D6E8FF",
    marginTop: 4,
    marginBottom: 2,
    width: "100%",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.brand.blue,
    letterSpacing: 0.2,
    textAlign: "center",
  },

  // ── Share Listing Button ──
  cardShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#D6E8FF",
    marginTop: 8,
    width: "100%",
  },
  cardShareBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.brand.blue,
    letterSpacing: 0.2,
  },

  // ─────────────────────────────────────────────────────────────
  // Kept (older keys) so nothing breaks if referenced elsewhere
  // ─────────────────────────────────────────────────────────────
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 12,
  },
  typeBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.8,
  },
  imageCount: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  imageCountText: { fontSize: 11, fontWeight: "600", color: "#FFF" },

  locationRowCard: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  locationTextCard: { fontSize: 12, color: Colors.text.secondary, fontWeight: "500" },
  locationDateText: { fontSize: 12, color: Colors.text.tertiary, fontWeight: "400" },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF2F8",
  },
  cardPrice: { fontSize: 22, fontWeight: "900", color: Colors.brand.blue, letterSpacing: -0.6 },
  cardPriceNote: { fontSize: 12, fontWeight: "500", color: Colors.text.tertiary },
  cardDeposit: { fontSize: 11, color: Colors.text.tertiary, marginTop: 3 },
  badgesStack: { gap: 5, alignItems: "flex-end" },

  statsInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    backgroundColor: "#F8FAFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EDF2F8",
    flexWrap: "wrap",
  },
  statInlineVal: { fontSize: 12, fontWeight: "700", color: Colors.text.primary },
  statInlineDot: { fontSize: 12, color: "#D1D5DB", fontWeight: "700" },

  availNowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#16A34A",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  availNowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
});
