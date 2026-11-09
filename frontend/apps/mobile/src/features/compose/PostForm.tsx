// Split out of app/create-post.tsx (TR-013, point 9b).
import { queryClient } from "../../services/cache/queryClient";
import { palette } from "../../theme/palette";
import { Switch } from "../../shared/ui/Switch";
import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, ActionSheetIOS } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../theme/useTheme";
import { useAuthStore } from "../../store/auth.store";
import { useSidebarStore } from "../../store/sidebar.store";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { createPost, getPost, updatePost, type FeedCategory, type UpdatePostPayload } from "../../api/feed.api";
import { createEvent, uploadEventImages } from "../../api/events.api";
import { createListing, getListing, removeListingImage, reorderListingImages, updateListing, uploadListingImages, type HousingListingImageRef, type ListingStatus, type UpdateListingPayload } from "../../api/housing.api";
import { formatPrice, getCurrencyForCountry } from "../../utils/currency";
import { createSharedSpace, uploadSharedSpaceImages } from "../../api/roommates.api";
import { getBusinessCurrency } from "../../utils/currency";
import { createRestaurant, submitReview, uploadRestaurantImages, type Restaurant } from "../../api/food.api";
import { ReviewPicker } from "../../features/food/components/ReviewPicker";
import { ListingQuestions, clearListingDraft } from "../../features/housing/components/ListingQuestions";
import { StoryComposer } from "../../features/explore/components/StoryComposer";
import { createStory } from "../../api/stories.api";
import { createChallenge } from "../../api/challenges.api";
import { ApiError } from "../../api/client";
import { DatePickerField, TimePickerField } from "../../../components/DateTimePickerField";
import { FadeImage } from "../../../components/FadeImage";
import { appAlert } from "../../shared/ui/Dialogs";
import { TYPE } from "../../theme/d";
import { Chip, ChipInput, PressableScale, Segmented, Stepper } from "../../shared/d";
import { AttachedFile } from "./AttachedFile";
import { ChipMulti, ChipSelect } from "./ChipSelect";
import { DraggableListingImage } from "./DraggableListingImage";
import { ImageThumbnailStrip } from "./ImageThumbnailStrip";
import { MediaPickerSheet, SectionLabel } from "./MediaPickerSheet";
import { openPreview } from "./previewStore";
import { buildDirtyListingPayload, mimeForListingImage, normalizeAvailableDateValue, propertyTypeToLabel, sprint42ImageError } from "./listingEdit";
import { mapChallengeDurationLabel, mapChallengeTypeLabel, mapEventCategoryLabel, mapEventFormatLabel, mapPropertyTypeLabel, mapRestaurantPriceChip, mapStoryCategoryLabel, mapStoryMediaUi, parseFlexibleDateToIsoDate, splitHashtagInput } from "./mappers";
import { ALL_CATEGORIES, NEWS_LABEL_TO_FEED, PostType, QUEST_TEMPLATES, STORY_CATEGORY_OPTIONS } from "./postTypes";
import { s } from "./styles";
import { AttachedMedia, FEED_TO_NEWS_LABEL } from "./types";

// ── Full form for a selected post type ────────────────────────────────────────
export function PostForm({ type, onBack, initialMode, editId }: { type: PostType; onBack: () => void; initialMode?: string; editId?: string }) {
  const insetsTop = 0; // the screen's SafeAreaView already clears the status bar // SPRINT-42: accept the entity id selected by owner-only edit actions.
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const {
    canPostListing,
    canPostRestaurant,
    canPostRestaurantReview,
    isAdmin,
    isVerifiedLandlord,
    isVerifiedAgency,
    isVerifiedRestaurantOwner,
  } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);
  const [newsMoreOpen, setNewsMoreOpen] = useState(false);
  const [sourceLabel, setSourceLabel] = useState(""); // SPRINT-42: support the sixth editable feed field in create and edit.
  const [editLoading, setEditLoading] = useState(initialMode === "edit"); // SPRINT-42: block editing until authoritative detail data is loaded.
  const editOriginalRef = useRef<Record<string, unknown> | null>(null); // SPRINT-42: retain a non-persisted baseline for dirty-field PATCH.

  // ── Media picker sheet state (Android; iOS uses ActionSheetIOS) ──
  const [pickerSheetVisible, setPickerSheetVisible] = useState(false);
  const pickerResolveRef = useRef<{ onLibrary: () => void; onCamera: () => void } | null>(null);

  // Replaces appAlert("Add Media", ...) everywhere with native pickers
  const showMediaPicker = (onLibrary: () => void, onCamera: () => void, title?: string) => {
    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo Library", "Camera"], cancelButtonIndex: 0, title },
        (idx) => { if (idx === 1) onLibrary(); else if (idx === 2) onCamera(); }
      );
    } else {
      pickerResolveRef.current = { onLibrary, onCamera };
      setPickerSheetVisible(true);
    }
  };

  // ── Listing fields ──
  const [propType, setPropType] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [floor, setFloor] = useState("");
  const [available, setAvailable] = useState("");
  const [petPolicy, setPetPolicy] = useState("");
  const [parking, setParking] = useState("");
  const [laundry, setLaundry] = useState("");
  const [heating, setHeating] = useState("");
  const [cooling, setCooling] = useState("");
  const [utilities, setUtilities] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [furnished, setFurnished] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [listingStep, setListingStep] = useState(1);
  const userCountryCode =
    (user as any)?.userLocation?.countryCode ||
    (user?.country === "United Kingdom" ? "GB" : "US");
  const derivedListingCurrency = getCurrencyForCountry(userCountryCode);
  const [listingCurrency, setListingCurrency] = useState(derivedListingCurrency.code); // SPRINT-42: editable currency; edit mode loads the listing's actual currency.
  const [listingCity, setListingCity] = useState("");
  const [listingState, setListingState] = useState("");
  const [listingCountry, setListingCountry] = useState("");
  const [yearBuiltStr, setYearBuiltStr] = useState("");
  const [transitInfoStr, setTransitInfoStr] = useState("");
  const [walkScoreStr, setWalkScoreStr] = useState("");
  const [utilitiesText, setUtilitiesText] = useState("");
  const [listingFurnishedSwitch, setListingFurnishedSwitch] = useState(false);
  const [listingStepError, setListingStepError] = useState<string | null>(null);
  /** Listing photos only (Step 4); separate from `attachedFiles` used by other post types. */
  const [listingImages, setListingImages] = useState<AttachedMedia[]>([]);
  // The one-question listing flow posts through handlePost once listingStep is 4 (its canPost gate).
  const [listingPostReq, setListingPostReq] = useState(0);
  useEffect(() => { if (listingPostReq > 0) void handlePost(); }, [listingPostReq]); // eslint-disable-line react-hooks/exhaustive-deps -- fire once per request
  const [existingListingImages, setExistingListingImages] = useState<HousingListingImageRef[]>([]); // SPRINT-42: keep persisted images separate from detail fields and new picks.
  const [listingStatus, setListingStatus] = useState<ListingStatus>("AVAILABLE"); // SPRINT-42: expose the owner-controlled listing lifecycle.
  const [imageBusy, setImageBusy] = useState(false); // SPRINT-42: serialize immediate image mutations.

  const isEditing = initialMode === "edit" && !!editId; // SPRINT-42: distinguish entity editing from existing restaurant review mode.

  useEffect(() => { // SPRINT-42: prefill every supported field from the authoritative detail endpoint.
    if (!isEditing || !editId) { setEditLoading(false); return; } // SPRINT-42: preserve all existing creation modes.
    let cancelled = false; // SPRINT-42: avoid setting state after navigation away.
    setEditLoading(true); // SPRINT-42: show a deterministic loading gate.
    const load = async () => { // SPRINT-42: branch by the reused composer type.
      try { // SPRINT-42: surface load failures without partially populated forms.
        if (type.id === "news") { // SPRINT-42: load the standard feed post detail.
          const post = await queryClient.fetchQuery({ queryKey: ["feed", "post", editId], queryFn: () => getPost(editId), staleTime: 0 }); // SPRINT-42: fetch all six editable fields and persisted media.
          if (cancelled) return; // SPRINT-42: stop after unmount.
          const baseline = { title: post.title, content: post.content, category: post.category, tags: post.tags ?? [], location: post.location ?? "", sourceLabel: post.sourceLabel ?? "" }; // SPRINT-42: normalize nullable fields for dirty comparison.
          editOriginalRef.current = baseline; // SPRINT-42: save the original feed values in memory only.
          setTitle(post.title); setBody(post.content); setNewsCategory(FEED_TO_NEWS_LABEL[post.category as FeedCategory] ?? "Community"); // SPRINT-42: prefill required post fields.
          setNewsTags((post.tags ?? []).join(", ")); setLocation(post.location ?? ""); setSourceLabel(post.sourceLabel ?? ""); // SPRINT-42: prefill optional post fields.
          setAttachedFiles((post.media ?? []).map((m) => ({ uri: m.url, name: m.id, mediaType: "photo" as const }))); // SPRINT-42: show existing feed media read-only.
          setNewsMoreOpen(true); // SPRINT-42: reveal all editable post fields immediately.
        } else if (type.id === "listing") { // SPRINT-42: load the standard listing detail.
          const listing = await queryClient.fetchQuery({ queryKey: ["housing", "edit", editId], queryFn: () => getListing(editId), staleTime: 0 }); // SPRINT-42: fetch all Sprint 37 editable fields and ordered images.
          if (cancelled) return; // SPRINT-42: stop after unmount.
          if (listing.isOwner !== true) { // SPRINT-42: deep-link edit must reject non-owners before prefill.
            appAlert("Not allowed", "You can only edit listings you own.", [{ text: "Back", onPress: () => router.back() }]); // SPRINT-42: clear ownership rejection.
            return; // SPRINT-42: do not populate the editor for a foreign listing.
          } // SPRINT-42: finish ownership gate.
          const orderedImages = [...(Array.isArray(listing.images) ? listing.images : [])].filter((image): image is HousingListingImageRef => !!image && typeof image === "object" && typeof (image as HousingListingImageRef).id === "string").sort((a, b) => a.order - b.order); // SPRINT-42: preserve canonical backend ordering.
          const baselineAmenities = Array.isArray(listing.amenities) && listing.amenities.length > 0 ? listing.amenities : Array.isArray(listing.tags) && listing.tags.length > 0 ? listing.tags : undefined; // SPRINT-42: prefer canonical amenities and avoid empty-array dirty noise.
          const availableDateNorm = normalizeAvailableDateValue(listing.availableDate ?? listing.available); // SPRINT-42: store availability as YYYY-MM-DD for dirty equality.
          const baseline: Record<string, unknown> = { // SPRINT-42: normalize every Sprint 37 editable listing field without fabricating empties.
            title: listing.title, // SPRINT-42: required title baseline.
            description: listing.description, // SPRINT-42: required description baseline.
            propertyType: listing.propertyType ?? listing.type, // SPRINT-42: canonical property enum baseline.
            price: listing.price, // SPRINT-42: price baseline.
            currency: (listing.currency ?? "USD").toUpperCase().slice(0, 8), // SPRINT-42: actual listing currency, not profile-derived.
            deposit: listing.deposit == null ? undefined : Number(listing.deposit), // SPRINT-42: null deposit compares equal to unset.
            bedrooms: listing.bedrooms ?? listing.beds ?? 0, // SPRINT-42: bedroom baseline.
            bathrooms: listing.bathrooms ?? listing.baths ?? 0, // SPRINT-42: bathroom baseline.
            sqft: listing.sqft == null ? undefined : listing.sqft, // SPRINT-42: null sqft compares equal to unset.
            floor: listing.floor == null || listing.floor === "" ? undefined : String(listing.floor), // SPRINT-42: string floor baseline.
            address: listing.address ?? "", // SPRINT-42: address baseline.
            neighborhood: listing.neighborhood == null || listing.neighborhood === "" ? undefined : listing.neighborhood, // SPRINT-42: optional neighborhood.
            city: listing.city ?? "", // SPRINT-42: city without profile fallback in edit mode.
            state: listing.state == null || listing.state === "" ? undefined : listing.state, // SPRINT-42: no profile state fallback.
            country: listing.country ?? "", // SPRINT-42: country without profile fallback in edit mode.
            availableDate: availableDateNorm, // SPRINT-42: date-only availability baseline.
            leaseTerm: listing.leaseTerm == null || listing.leaseTerm === "" ? undefined : listing.leaseTerm, // SPRINT-42: optional lease.
            isFurnished: listing.isFurnished ?? listing.furnished ?? false, // SPRINT-42: furnished baseline.
            petPolicy: listing.petPolicy == null || listing.petPolicy === "" ? undefined : listing.petPolicy, // SPRINT-42: optional pet policy.
            parking: listing.parking == null || listing.parking === "" ? undefined : listing.parking, // SPRINT-42: optional parking.
            laundry: listing.laundry == null || listing.laundry === "" ? undefined : listing.laundry, // SPRINT-42: optional laundry.
            heating: listing.heating == null || listing.heating === "" ? undefined : listing.heating, // SPRINT-42: optional heating.
            cooling: listing.cooling == null || listing.cooling === "" ? undefined : listing.cooling, // SPRINT-42: optional cooling.
            utilities: typeof listing.utilities === "string" && listing.utilities.trim() ? listing.utilities : Array.isArray(listing.utilities) && listing.utilities.length ? listing.utilities.join(", ") : undefined, // SPRINT-42: optional utilities string.
            yearBuilt: listing.yearBuilt == null ? undefined : listing.yearBuilt, // SPRINT-42: null year compares equal to unset.
            amenities: baselineAmenities, // SPRINT-42: amenities or undefined when empty.
            transitInfo: listing.transitInfo == null || listing.transitInfo === "" ? undefined : listing.transitInfo, // SPRINT-42: optional transit.
            walkScore: listing.walkScore == null ? undefined : listing.walkScore, // SPRINT-42: null walk score compares equal to unset.
            status: listing.status, // SPRINT-42: lifecycle status baseline.
          }; // SPRINT-42: finish normalized listing baseline.
          editOriginalRef.current = baseline; // SPRINT-42: save the listing baseline for dirty PATCH.
          setTitle(listing.title); setBody(listing.description); setPropType(propertyTypeToLabel(String(baseline.propertyType ?? "APARTMENT"))); setPrice(String(listing.price)); setDeposit(listing.deposit == null ? "" : String(listing.deposit)); // SPRINT-42: prefill core listing fields.
          setListingCurrency(String(baseline.currency ?? "USD")); // SPRINT-42: load the listing's persisted currency into editable state.
          setBeds(String(baseline.bedrooms ?? 0)); setBaths(String(baseline.bathrooms ?? 0)); setSqft(listing.sqft == null ? "" : String(listing.sqft)); setFloor(listing.floor == null ? "" : String(listing.floor)); // SPRINT-42: prefill rooms and size.
          setLocation(String(baseline.address ?? "")); setNeighborhood(listing.neighborhood ?? ""); setListingCity(listing.city ?? ""); setListingState(listing.state ?? ""); setListingCountry(listing.country ?? ""); // SPRINT-42: prefill address fields without coordinates or profile fallbacks.
          setAvailable(availableDateNorm ?? ""); setLeaseTerm(listing.leaseTerm ?? ""); setListingFurnishedSwitch(Boolean(baseline.isFurnished)); setPetPolicy(listing.petPolicy ?? ""); // SPRINT-42: prefill availability and policy fields with normalized date.
          setParking(listing.parking ?? ""); setLaundry(listing.laundry ?? ""); setHeating(listing.heating ?? ""); setCooling(listing.cooling ?? ""); setUtilitiesText(String(baseline.utilities ?? "")); // SPRINT-42: prefill services.
          setYearBuiltStr(listing.yearBuilt == null ? "" : String(listing.yearBuilt)); setAmenities(baselineAmenities ?? []); setTransitInfoStr(listing.transitInfo ?? ""); setWalkScoreStr(listing.walkScore == null ? "" : String(listing.walkScore)); // SPRINT-42: prefill remaining editable listing fields.
          setListingStatus(listing.status ?? "AVAILABLE"); setExistingListingImages(orderedImages); setListingStep(1); // SPRINT-42: prefill status and ordered image manager.
        } // SPRINT-42: finish supported edit types.
      } catch (error) { // SPRINT-42: report authoritative detail-load failures.
        appAlert("Could not load item", error instanceof ApiError ? error.message : "Please try again.", [{ text: "Back", onPress: () => router.back() }]); // SPRINT-42: show backend message where available.
      } finally { // SPRINT-42: release the loading gate.
        if (!cancelled) setEditLoading(false); // SPRINT-42: update only while mounted.
      } // SPRINT-42: finish edit load.
    }; // SPRINT-42: finish async loader.
    void load(); // SPRINT-42: begin edit prefill.
    return () => { cancelled = true; }; // SPRINT-42: cancel state writes after unmount.
  }, [editId, isEditing, type.id]); // SPRINT-42: reload only when the edited entity changes.

  // ── Restaurant mode — pre-set from route param (e.g. "Post Now" from local_reviewer badge) ──
  const [restaurantPostMode, setRestaurantPostMode] = useState<"owner" | "review">(
    initialMode === "review" ? "review" : "owner"
  );

  // ── Restaurant fields ──
  const [restName, setRestName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [priceRange, setPriceRange] = useState(type.id === "restaurant" ? "$ Mid-range" : "");
  const [avgPricePerPerson, setAvgPricePerPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  // Restaurant defaults the server needs anyway (design D `compose-restaurant`): $ and Dine-in.
  const [features, setFeatures] = useState<string[]>(type.id === "restaurant" ? ["Dine-in"] : []);
  const [restTags, setRestTags] = useState<string[]>([]);
  const [restCity, setRestCity] = useState(user?.city ?? "");
  const [restState, setRestState] = useState("");
  const [restCountry, setRestCountry] = useState(user?.country ?? "");
  const [restWaitTime, setRestWaitTime] = useState("");

  // ── Local-review fields ──
  // Review: the restaurant picked from the list and the stars (design D `compose-review`).
  const [reviewTarget, setReviewTarget] = useState<Restaurant | null>(null);
  const [reviewN, setReviewN] = useState(0);

  // ── Event fields ──
  const [eventCategory, setEventCategory] = useState("");
  const [eventFormat, setEventFormat] = useState("In-Person");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [ticketType, setTicketType] = useState("Free");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  // ── News fields ──
  const [newsCategory, setNewsCategory] = useState("");
  const [newsTags, setNewsTags] = useState("");

  // ── Story fields ──
  const [storyCatPick, setStoryCatPick] = useState("");
  const [storyTagsInput, setStoryTagsInput] = useState("");

  // ── Challenge fields ──
  const [challengeType, setChallengeType] = useState("");
  const [questTemplate, setQuestTemplate] = useState<string | null>(null);
  const [challengeDuration, setChallengeDuration] = useState("");
  const [challengeGoal, setChallengeGoal] = useState("");
  const [challengeReward, setChallengeReward] = useState("");
  const [challengeMaxParticipants, setChallengeMaxParticipants] = useState("");
  const [challengeHashtags, setChallengeHashtags] = useState("");

  const [sharedSpacePrice, setSharedSpacePrice] = useState("");
  const [sharedSpaceDeposit, setSharedSpaceDeposit] = useState("");
  const [sharedSpaceCurrency, setSharedSpaceCurrency] = useState("USD");
  const [sharedSpaceRooms, setSharedSpaceRooms] = useState("1");
  const [sharedSpaceBaths, setSharedSpaceBaths] = useState("1");
  const [sharedSpaceTotalOccupants, setSharedSpaceTotalOccupants] = useState("1");
  const [sharedSpaceAvailableSpots, setSharedSpaceAvailableSpots] = useState("1");
  const [sharedSpaceCity, setSharedSpaceCity] = useState(user?.city ?? "");
  const [sharedSpaceState, setSharedSpaceState] = useState("");
  const [sharedSpaceCountry, setSharedSpaceCountry] = useState(user?.country ?? "");
  useEffect(() => {
    const c = getBusinessCurrency(null, sharedSpaceCountry.trim() || user?.country || "");
    if (c) setSharedSpaceCurrency(c.code);
  }, [sharedSpaceCountry, user?.country]);
  const [sharedSpacePetPolicy, setSharedSpacePetPolicy] = useState("");
  const [sharedSpaceSmoking, setSharedSpaceSmoking] = useState(false);
  const [sharedSpaceHouseRules, setSharedSpaceHouseRules] = useState("");
  const [sharedSpaceAmenities, setSharedSpaceAmenities] = useState<string[]>([]);

  const hasPhotoAttachment = attachedFiles.some((file) => file.mediaType === "photo");
  const hasVideoAttachment = attachedFiles.some((file) => file.mediaType === "video");
  /** Story: one photo or one video (type inferred from the file). */
  const storyHasRequiredMedia =
    attachedFiles.length > 0 && (hasPhotoAttachment || hasVideoAttachment);

  const listingPriceNum = parseFloat(price.replace(/,/g, ""));
  const listingBedsNum = parseInt(beds, 10);
  const listingBathsNum = parseFloat(String(baths).replace(",", "."));
  const listingCityEff = isEditing ? listingCity.trim() : (listingCity.trim() || user?.city?.trim() || ""); // SPRINT-42: edit mode never falls back to profile city.
  const listingCountryEff = isEditing ? listingCountry.trim() : (listingCountry.trim() || user?.country?.trim() || ""); // SPRINT-42: edit mode never falls back to profile country.
  const yearBuiltParsed = yearBuiltStr.trim() ? parseInt(yearBuiltStr, 10) : NaN;
  const yearBuiltOk =
    !yearBuiltStr.trim() ||
    (!Number.isNaN(yearBuiltParsed) && yearBuiltParsed >= 1800 && yearBuiltParsed <= 2100);
  const walkParsed = walkScoreStr.trim() ? parseInt(walkScoreStr, 10) : NaN;
  const walkOk =
    !walkScoreStr.trim() || (!Number.isNaN(walkParsed) && walkParsed >= 0 && walkParsed <= 100);
  const depositParsed = deposit.trim() ? parseFloat(deposit.replace(/,/g, "")) : undefined;
  const depositOk = depositParsed == null || (!Number.isNaN(depositParsed) && depositParsed >= 0); // SPRINT-42: deposit 0 is valid; require non-negative only.
  const listingValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    propType.length > 0 &&
    !Number.isNaN(listingPriceNum) &&
    listingPriceNum > 0 &&
    location.trim().length > 0 &&
    listingCityEff.length > 0 &&
    listingCountryEff.length > 0 &&
    !Number.isNaN(listingBedsNum) &&
    listingBedsNum >= 0 &&
    !Number.isNaN(listingBathsNum) &&
    listingBathsNum >= 0 &&
    yearBuiltOk &&
    walkOk &&
    depositOk;

  const validateListingStep = (step: number): boolean => {
    setListingStepError(null);
    if (step === 1) {
      if (!title.trim() || !body.trim() || !propType) {
        setListingStepError("Title, description, and property type are required.");
        return false;
      }
      if (Number.isNaN(listingPriceNum) || listingPriceNum <= 0) {
        setListingStepError("Enter a valid monthly rent.");
        return false;
      }
      if (deposit.trim()) {
        const d = parseFloat(deposit.replace(/,/g, ""));
        if (Number.isNaN(d) || d < 0) { // SPRINT-42: deposit may be zero; reject only negatives.
          setListingStepError("Deposit must be a non-negative number."); // SPRINT-42: match backend @Min(0).
          return false;
        }
      }
      return true;
    }
    if (step === 2) {
      if (Number.isNaN(listingBedsNum) || listingBedsNum < 0) {
        setListingStepError("Enter a valid bedroom count (0 or more).");
        return false;
      }
      if (Number.isNaN(listingBathsNum) || listingBathsNum < 0) {
        setListingStepError("Enter a valid bathroom count (0 or more, decimals allowed).");
        return false;
      }
      if (yearBuiltStr.trim() && !yearBuiltOk) {
        setListingStepError("Year built must be between 1800 and 2100.");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!location.trim()) {
        setListingStepError("Street address is required.");
        return false;
      }
      if (location.trim().length < 5) {
        setListingStepError("Please enter a complete street address (e.g. 123 Main St).");
        return false;
      }
      if (!/\d/.test(location.trim())) {
        setListingStepError("Street address must include a street number (e.g. 123 Main St).");
        return false;
      }
      if (!listingCityEff.length) {
        setListingStepError("City is required.");
        return false;
      }
      if (!listingCountryEff.length) {
        setListingStepError("Country is required.");
        return false;
      }
      if (walkScoreStr.trim() && !walkOk) {
        setListingStepError("Walk score must be between 0 and 100.");
        return false;
      }
      return true;
    }
    return true;
  };

  const eventValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    eventDate.trim().length > 0 &&
    eventTime.trim().length > 0 &&
    location.trim().length > 0;

  const challengeValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    challengeType.length > 0 &&
    challengeDuration.length > 0 &&
    challengeGoal.trim().length > 0 &&
    challengeReward.trim().length > 0;

  const sharedSpacePriceNum = parseFloat(sharedSpacePrice.replace(/,/g, ""));
  const sharedSpaceValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    location.trim().length > 0 &&
    sharedSpaceCity.trim().length > 0 &&
    sharedSpaceCountry.trim().length > 0 &&
    !Number.isNaN(sharedSpacePriceNum) &&
    sharedSpacePriceNum > 0 &&
    (parseInt(sharedSpaceRooms, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceBaths, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceTotalOccupants, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceAvailableSpots, 10) || 0) >= 1;

  const restaurantOwnerValid =
    restName.trim().length > 0 &&
    body.trim().length > 0 &&
    cuisine.length > 0 &&
    priceRange.length > 0 &&
    location.trim().length > 0 &&
    restCity.trim().length > 0 &&
    restCountry.trim().length > 0;

  const restaurantReviewValid = !!reviewTarget && reviewN > 0;

  const canPost =
    type.id === "restaurant"
      ? restaurantPostMode === "owner"
        ? restaurantOwnerValid
        : restaurantReviewValid
      : type.id === "listing"
      ? listingValid && listingStep === 4
      : type.id === "shared_space"
      ? sharedSpaceValid
      : type.id === "story"
      ? storyHasRequiredMedia
      : type.id === "challenge"
      ? challengeValid
      : type.id === "event"
      ? eventValid
      : title.trim().length > 0 && body.trim().length > 0;

  const canSubmit = canPost && !submitting;

  const isStoryForm = type.id === "story";
  const mediaBtnTitle = isStoryForm
    ? attachedFiles.length > 0
      ? "Replace media"
      : "Add photo or video"
    : type.id === "shared_space"
      ? attachedFiles.length > 0
        ? "Add more photos"
        : "Add photos"
      : attachedFiles.length > 0
        ? "Add More Media"
        : "Add Media";
  const maxAttachUi = type.id === "shared_space" ? 6 : 5;
  const mediaBtnDesc = isStoryForm
    ? attachedFiles.length > 0
      ? "One item per story — tap to pick a different file"
      : "Pick one photo or one video (up to 2 minutes)"
    : type.id === "shared_space"
      ? attachedFiles.length > 0
        ? `${attachedFiles.length}/${maxAttachUi} photos — tap to add more`
        : "Tap to add up to 6 photos (optional)"
      : attachedFiles.length > 0
        ? `${attachedFiles.length}/${maxAttachUi} attached — tap to browse photos or videos`
        : "Tap to browse photos or videos";

  const acceptListingImages = async (assets: ImagePicker.ImagePickerAsset[]) => { // SPRINT-42: validate and either stage or immediately upload listing images.
    for (const asset of assets) { // SPRINT-42: validate each selected file including measured byte size.
      const error = await sprint42ImageError(asset); // SPRINT-42: mime + 5 MiB with filesystem fallback.
      if (error) { appAlert("Invalid image", error); return; } // SPRINT-42: explain type, unknown size, or size validation failure.
    } // SPRINT-42: finish per-asset validation.
    if (existingListingImages.length + listingImages.length + assets.length > 6) { appAlert("Max 6 photos", "A listing can have up to 6 photos."); return; } // SPRINT-42: enforce capacity across persisted and staged media.
    const files = assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `listing_${existingListingImages.length + listingImages.length + index + 1}.jpg`, type: asset.mimeType ?? mimeForListingImage(asset.uri) })); // SPRINT-42: create backend-compatible multipart file metadata.
    if (isEditing && editId) { // SPRINT-42: apply image changes independently and immediately during edit.
      setImageBusy(true); // SPRINT-42: prevent overlapping image mutations.
      try { // SPRINT-42: retain authoritative backend errors.
        const images = await uploadListingImages(editId, files); // SPRINT-42: upload through the existing multipart implementation.
        setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: consume the complete ordered response.
      } catch (errorValue) { // SPRINT-42: report immediate upload failure.
        appAlert("Upload failed", errorValue instanceof ApiError ? errorValue.message : "Could not upload images."); // SPRINT-42: show backend capacity messages exactly.
      } finally { setImageBusy(false); } // SPRINT-42: release image controls after upload.
      return; // SPRINT-42: do not stage edit-mode files for detail Save.
    } // SPRINT-42: finish immediate upload branch.
    setListingImages((previous) => [...previous, ...assets.map((asset, index) => ({ uri: asset.uri, name: files[index].name, mediaType: "photo" as const, mimeType: files[index].type, fileSize: asset.fileSize ?? undefined }))]); // SPRINT-42: retain validated create-mode images.
  }; // SPRINT-42: end listing image acceptance.

  const handleListingPickImages = () => { // SPRINT-42: add images while accounting for already-persisted edit media.
    if (existingListingImages.length + listingImages.length >= 6) { // SPRINT-42: enforce the complete listing capacity.
      appAlert("Max 6 photos", "You can add up to 6 listing photos."); // SPRINT-42: explain the capacity gate.
      return; // SPRINT-42: stop before opening the picker.
    } // SPRINT-42: finish capacity guard.
    const fromLibrary = async () => { // SPRINT-42: select one or more supported image files.
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Photo library access is needed."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true,
        selectionLimit: 6 - existingListingImages.length - listingImages.length, quality: 0.85, // SPRINT-42: cap picker selection against persisted plus staged images.
      });
      if (!result.canceled && result.assets.length > 0) {
        await acceptListingImages(result.assets); // SPRINT-42: validate and apply selected files.
      }
    };
    const fromCamera = async () => { // SPRINT-42: capture a supported listing image.
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed."); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        await acceptListingImages([result.assets[0]]); // SPRINT-42: validate and apply the captured image.
      }
    };
    showMediaPicker(fromLibrary, fromCamera, "Add Listing Photos");
  };

  const handleRemoveExistingListingImage = (image: HousingListingImageRef) => { // SPRINT-42: confirm before an immediate persisted-image removal.
    if (!editId || imageBusy) return; // SPRINT-42: require an active listing edit and idle image manager.
    appAlert("Remove photo?", "This image will be removed immediately.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { // SPRINT-42: make immediate behavior explicit.
      setImageBusy(true); // SPRINT-42: serialize remove with add/reorder.
      try { // SPRINT-42: preserve backend validation errors.
        const images = await removeListingImage(editId, image.id); // SPRINT-42: delete the selected persisted image.
        setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: accept zero images as the valid empty state.
      } catch (errorValue) { appAlert("Remove failed", errorValue instanceof ApiError ? errorValue.message : "Could not remove the image."); } // SPRINT-42: surface backend errors.
      finally { setImageBusy(false); } // SPRINT-42: release the image manager.
    } }]); // SPRINT-42: close remove confirmation.
  }; // SPRINT-42: end immediate image removal.

  const handleMoveExistingListingImage = async (from: number, to: number) => { // SPRINT-42: optimistically persist a complete drag order.
    if (!editId || imageBusy || from === to) return; // SPRINT-42: ignore invalid or overlapping drops.
    const previous = existingListingImages; // SPRINT-42: retain the exact pre-drag order for rollback.
    const next = [...previous]; // SPRINT-42: create the optimistic image sequence.
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved); // SPRINT-42: move the dragged image to its drop index.
    setExistingListingImages(next.map((image, index) => ({ ...image, order: index }))); // SPRINT-42: update primary-photo labeling immediately.
    setImageBusy(true); // SPRINT-42: serialize the reorder request.
    try { // SPRINT-42: submit the complete exact-set image id order.
      const images = await reorderListingImages(editId, next.map((image) => image.id)); // SPRINT-42: persist the optimistic drop.
      setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: reconcile with authoritative backend order.
    } catch (errorValue) { // SPRINT-42: revert a failed optimistic reorder.
      setExistingListingImages(previous); // SPRINT-42: restore the precise prior sequence.
      appAlert("Reorder failed", errorValue instanceof ApiError ? errorValue.message : "Could not reorder images."); // SPRINT-42: surface backend error text.
    } finally { setImageBusy(false); } // SPRINT-42: release image controls after drop.
  }; // SPRINT-42: end drag reorder handler.

  const handleAttachFile = () => {
    const maxAttach = type.id === "shared_space" ? 6 : 5;
    if (type.id !== "story" && attachedFiles.length >= maxAttach) {
      appAlert(`Max ${maxAttach} photos`, `You can attach up to ${maxAttach} images for this post type.`);
      return;
    }
    const isStory = type.id === "story";
    const imagesOnly = type.id === "shared_space";

    const fromLibrary = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Photo library access is needed to attach images."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: isStory ? 1 : (type.id === "shared_space" ? 6 : 5) - attachedFiles.length,
        quality: isStory ? 0.9 : 0.8,
        videoMaxDuration: isStory ? 120 : undefined,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newFiles = result.assets
          .filter((a) => !imagesOnly || (a.type || "image").toLowerCase() !== "video")
          .map((a, i) => {
            const isVideo = (a.type || "image").toLowerCase() === "video";
            return { uri: a.uri, name: a.fileName || `media_${attachedFiles.length + i + 1}.${isVideo ? "mp4" : "jpg"}`, mediaType: (isVideo ? "video" : "photo") as "photo" | "video", duration: a.duration } as AttachedMedia;
          });
        if (isStory) setAttachedFiles(newFiles.slice(0, 1));
        else setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, type.id === "shared_space" ? 6 : 5));
      }
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed to take photos."); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
        quality: isStory ? 0.9 : 0.8, videoMaxDuration: isStory ? 120 : undefined,
      });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = !imagesOnly && (a.type || "image").toLowerCase() === "video";
        const newItem: AttachedMedia = { uri: a.uri, name: a.fileName || `camera_${attachedFiles.length + 1}.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined };
        if (isStory) setAttachedFiles([newItem]);
        else setAttachedFiles((prev) => [...prev, newItem].slice(0, type.id === "shared_space" ? 6 : 5));
      }
    };
    showMediaPicker(fromLibrary, fromCamera, "Add Media");
  };

  const handleAttachSpecificMedia = (mediaType: "Images" | "Videos") => {
    const fromLibrary = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", `Photo library access is needed to attach ${mediaType.toLowerCase()}.`); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === "Images" ? ['images'] : ['videos'],
        allowsMultipleSelection: false, selectionLimit: 1, quality: 0.9, videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = (a.type || "image").toLowerCase() === "video";
        setAttachedFiles([{ uri: a.uri, name: a.fileName || `story_media.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined, fileSize: a.fileSize ?? undefined }]);
      }
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed to take a photo or record video."); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: mediaType === "Images" ? ['images'] : ['videos'], quality: 0.9, videoMaxDuration: 120 });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = (a.type || "image").toLowerCase() === "video";
        setAttachedFiles([{ uri: a.uri, name: a.fileName || `story_camera.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined, fileSize: a.fileSize ?? undefined }]);
      }
    };
    showMediaPicker(fromLibrary, fromCamera, mediaType === "Images" ? "Add Photo" : "Add Video");
  };

  const handlePost = async () => {
    if (!user?.id) {
      appAlert("Sign in required", "Log in to publish content.");
      return;
    }
    if (isEditing && type.id === "news") { // SPRINT-42: enforce the feed PATCH contract before dirty comparison.
      if (title.trim().length < 1 || title.trim().length > 120) { appAlert("Invalid title", "Title must be between 1 and 120 characters."); return; } // SPRINT-42: validate title bounds.
      if (body.trim().length < 1 || body.trim().length > 2000) { appAlert("Invalid content", "Content must be between 1 and 2000 characters."); return; } // SPRINT-42: validate content bounds.
      if (location.trim().length > 200) { appAlert("Invalid location", "Location must be 200 characters or fewer."); return; } // SPRINT-42: validate location bound.
      if (sourceLabel.trim().length > 100) { appAlert("Invalid source label", "Source label must be 100 characters or fewer."); return; } // SPRINT-42: validate source-label bound.
      if (!newsCategory || !NEWS_LABEL_TO_FEED[newsCategory]) { appAlert("Invalid category", "Choose a valid category."); return; } // SPRINT-42: reject unmapped category values.
    } // SPRINT-42: finish feed edit validation.
    if (!canPost || submitting) return;

    const labels: Record<string, string> = {
      listing: "Listing Published! 🏠",
      shared_space: "Shared space listed! 🏠",
      restaurant: "Restaurant Added! 🍽️",
      event: "Event Created! 🎉",
      news: "Post Published! 📰",
      story: "Story Shared! 📸",
      challenge: "Challenge Created! 🏆",
    };
    const routeMap: Record<string, string> = {
      news: "/(tabs)/feed",
      event: "/(tabs)/feed",
      listing: "/(tabs)/housing",
      shared_space: "/(tabs)/housing",
      restaurant: "/(tabs)/food",
      story: "/(tabs)/feed",
      challenge: "/(tabs)/feed",
    };
    const targetRoute = routeMap[type.id] || "/(tabs)/feed";
    let createdListingId: string | undefined;
    const goAfterPublish = () => {
      if (type.id === "story") {
        router.push({ pathname: "/(tabs)/feed", params: { exploreTab: "Stories" } } as any);
      } else if (type.id === "listing" && createdListingId) {
        router.push(`/listing/${encodeURIComponent(createdListingId)}` as never);
      } else {
        router.push(targetRoute as any);
      }
    };

    setSubmitting(true);
    try {
      switch (type.id) {
        case "news": {
          const cat = newsCategory ? NEWS_LABEL_TO_FEED[newsCategory] ?? "COMMUNITY" : "COMMUNITY";
          const current = { title: title.trim(), content: body.trim(), category: cat, tags: newsTags ? newsTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [], location: location.trim(), sourceLabel: sourceLabel.trim() }; // SPRINT-42: normalize all six editable feed fields.
          if (isEditing && editId) { // SPRINT-42: save only feed fields changed from the loaded detail.
            const original = editOriginalRef.current ?? {}; // SPRINT-42: read the in-memory edit baseline.
            const dirty = Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]))) as UpdatePostPayload; // SPRINT-42: construct a dirty-field-only PATCH payload.
            if (Object.keys(dirty).length === 0) { router.back(); return; } // SPRINT-42: no changes navigates back without a request.
            await updatePost(editId, dirty); // SPRINT-42: PATCH and publish the immediate in-memory UI update.
            break; // SPRINT-42: skip create behavior in edit mode.
          } // SPRINT-42: finish feed update branch.
          await createPost({
            title: title.trim(),
            content: body.trim(),
            category: cat,
            tags: newsTags ? newsTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            location: location.trim() || undefined,
            sourceLabel: sourceLabel.trim() || undefined, // SPRINT-42: support source attribution during creation too.
            mediaAssets: attachedFiles,
          });
          break;
        }
        case "event": {
          const dateIso = parseFlexibleDateToIsoDate(eventDate);
          if (!dateIso) {
            appAlert("Invalid date", "Enter a valid date (e.g. Mar 15, 2026 or 2026-03-15).");
            return;
          }
          if (ticketType === "Paid") {
            const p = parseFloat(ticketPrice);
            if (Number.isNaN(p) || p < 0) {
              appAlert("Ticket price", "Enter a valid price for paid tickets.");
              return;
            }
          }
          const createdEvent = await createEvent({
            title: title.trim(),
            description: body.trim(),
            category: mapEventCategoryLabel(eventCategory),
            format: mapEventFormatLabel(eventFormat),
            date: dateIso,
            startTime: eventTime.trim(),
            endTime: eventEndTime.trim() || undefined,
            venue: location.trim(),
            city: user.city?.trim() || "Unknown",
            ticketType: ticketType === "Paid" ? "PAID" : "FREE",
            ticketPrice: ticketType === "Paid" ? parseFloat(ticketPrice) : undefined,
            capacity: (() => {
              if (!maxAttendees.trim()) return undefined;
              const n = parseInt(maxAttendees, 10);
              return Number.isNaN(n) ? undefined : n;
            })(),
          });
          const eventPhotos = attachedFiles.filter((f) => f.mediaType === "photo");
          if (eventPhotos.length > 0 && createdEvent?.id) {
            await uploadEventImages(
              createdEvent.id,
              eventPhotos.map((f, i) => ({
                uri: f.uri,
                name: f.name || `event_${i + 1}.jpg`,
              })),
            );
          }
          break;
        }
        case "shared_space": {
          if (!sharedSpaceValid) {
            const missing: string[] = [];
            if (!title.trim()) missing.push("title");
            if (!body.trim()) missing.push("description");
            if (!location.trim()) missing.push("address");
            if (!sharedSpaceCity.trim()) missing.push("city");
            if (!sharedSpaceCountry.trim()) missing.push("country");
            if (Number.isNaN(sharedSpacePriceNum) || sharedSpacePriceNum <= 0) missing.push("monthly rent");
            appAlert("Missing information", `Please fill: ${missing.join(", ")}`);
            return;
          }
          const space = await createSharedSpace({
            title: title.trim(),
            description: body.trim(),
            address: location.trim(),
            city: sharedSpaceCity.trim(),
            state: sharedSpaceState.trim() || undefined,
            country: sharedSpaceCountry.trim(),
            price: sharedSpacePriceNum,
            currency: (sharedSpaceCurrency.trim() || "USD").toUpperCase().slice(0, 8),
            deposit: sharedSpaceDeposit.trim() ? parseFloat(sharedSpaceDeposit.replace(/,/g, "")) : undefined,
            rooms: parseInt(sharedSpaceRooms, 10) || 1,
            bathrooms: parseInt(sharedSpaceBaths, 10) || 1,
            totalOccupants: parseInt(sharedSpaceTotalOccupants, 10) || 1,
            availableSpots: parseInt(sharedSpaceAvailableSpots, 10) || 1,
            petPolicy: sharedSpacePetPolicy.trim() || undefined,
            smoking: sharedSpaceSmoking,
            amenities: sharedSpaceAmenities.length ? sharedSpaceAmenities : undefined,
            houseRules: sharedSpaceHouseRules.trim() ? [sharedSpaceHouseRules.trim()] : [],
          });
          const photoFiles = attachedFiles.filter((f) => f.mediaType === "photo");
          if (photoFiles.length > 0) {
            await uploadSharedSpaceImages(
              space.id,
              photoFiles.map((f, i) => ({
                uri: f.uri,
                name: f.name || `space_${i + 1}.jpg`,
                type: mimeForListingImage(f.uri),
              })),
            );
          }
          break;
        }
        case "listing": {
          if (!validateListingStep(1)) {
            setListingStep(1);
            return;
          }
          if (!validateListingStep(2)) {
            setListingStep(2);
            return;
          }
          if (!validateListingStep(3)) {
            setListingStep(3);
            return;
          }
          const depositNum = deposit.trim() ? parseFloat(deposit.replace(/,/g, "")) : undefined;
          const sqftNum = sqft.trim() ? parseInt(sqft, 10) : undefined;
          const floorStr = floor.trim() || undefined;
          const walkNum = walkScoreStr.trim() ? parseInt(walkScoreStr, 10) : NaN;
          const current: UpdateListingPayload = { // SPRINT-42: normalize every Sprint 37 editable listing detail without coordinates or images.
            title: title.trim(), // SPRINT-42: include the validated listing title.
            description: body.trim(), // SPRINT-42: include the validated listing description.
            propertyType: mapPropertyTypeLabel(propType), // SPRINT-42: persist the canonical property enum.
            price: listingPriceNum, // SPRINT-42: include monthly price.
            currency: (listingCurrency.trim() || "USD").toUpperCase().slice(0, 8), // SPRINT-42: use editable listing currency (loaded from listing in edit mode).
            deposit: depositNum != null && !Number.isNaN(depositNum) ? depositNum : undefined, // SPRINT-42: include optional deposit including zero.
            bedrooms: listingBedsNum, // SPRINT-42: include bedroom count.
            bathrooms: listingBathsNum, // SPRINT-42: include bathroom count.
            sqft: sqftNum != null && !Number.isNaN(sqftNum) ? sqftNum : undefined, // SPRINT-42: include optional area.
            floor: floorStr, // SPRINT-42: include optional floor.
            address: location.trim(), // SPRINT-42: include address without coordinates.
            neighborhood: neighborhood.trim() || undefined, // SPRINT-42: include optional neighborhood.
            city: listingCityEff, // SPRINT-42: include city (no profile fallback while editing).
            state: isEditing ? (listingState.trim() || undefined) : (listingState.trim() || user.stateProvince?.trim() || undefined), // SPRINT-42: edit mode never injects profile state.
            country: listingCountryEff, // SPRINT-42: include country (no profile fallback while editing).
            availableDate: available.trim() ? normalizeAvailableDateValue(available) : undefined, // SPRINT-42: compare/PATCH the same YYYY-MM-DD shape as baseline.
            leaseTerm: leaseTerm.trim() || undefined, // SPRINT-42: include optional lease term.
            isFurnished: listingFurnishedSwitch, // SPRINT-42: use the canonical furnished field.
            petPolicy: petPolicy.trim() || undefined, // SPRINT-42: include optional pet policy.
            parking: parking.trim() || undefined, // SPRINT-42: include optional parking.
            laundry: laundry.trim() || undefined, // SPRINT-42: include optional laundry.
            heating: heating.trim() || undefined, // SPRINT-42: include optional heating.
            cooling: cooling.trim() || undefined, // SPRINT-42: include optional cooling.
            utilities: utilitiesText.trim() || undefined, // SPRINT-42: include optional utilities.
            yearBuilt: yearBuiltStr.trim() && yearBuiltOk && !Number.isNaN(yearBuiltParsed) ? yearBuiltParsed : undefined, // SPRINT-42: include optional construction year.
            amenities: amenities.length ? amenities : undefined, // SPRINT-42: include canonical amenities.
            transitInfo: transitInfoStr.trim() || undefined, // SPRINT-42: include optional transit details.
            walkScore: !Number.isNaN(walkNum) ? walkNum : undefined, // SPRINT-42: include optional walk score.
            ...(isEditing ? { status: listingStatus } : {}), // SPRINT-42: expose status only to listing owners in edit mode.
          }; // SPRINT-42: finish normalized listing details.
          if (isEditing && editId) { // SPRINT-42: save listing details independently from immediate image operations.
            const original = editOriginalRef.current ?? {}; // SPRINT-42: read the loaded listing baseline.
            const dirty = buildDirtyListingPayload(current, original); // SPRINT-42: null/undefined empties compare equal; only real changes remain.
            const bodyKeys = Object.keys(dirty).filter((key) => (dirty as Record<string, unknown>)[key] !== undefined); // SPRINT-42: ensure the JSON body would contain at least one key.
            if (bodyKeys.length === 0) { router.back(); return; } // SPRINT-42: no-op Save navigates back without PATCH {}.
            await updateListing(editId, dirty); // SPRINT-42: PATCH dirty fields and publish the in-memory listing update.
            break; // SPRINT-42: skip listing creation and image staging in edit mode.
          } // SPRINT-42: finish listing edit branch.
          const listing = await createListing(current as Parameters<typeof createListing>[0]); // SPRINT-42: reuse fully validated normalized fields for listing creation.
          createdListingId = listing.id;
          clearListingDraft();
          const photoFiles = listingImages.filter((f) => f.mediaType === "photo");
          if (photoFiles.length > 0) {
            try {
              await uploadListingImages(
                listing.id,
                photoFiles.map((f, i) => ({
                  uri: f.uri,
                  name: f.name || `listing_${i + 1}.jpg`,
                  type: mimeForListingImage(f.uri),
                })),
              );
            } catch {
              appAlert(
                "Photos not uploaded",
                "Your listing was published, but some images failed to upload. Open the listing to try again.",
              );
            }
          }
          break;
        }
        case "restaurant": {
          if (restaurantPostMode === "owner") {
            // Validate address format — must be meaningful (not just whitespace or very short)
            if (location.trim().length < 5) {
              appAlert("Invalid Address", "Please enter a complete street address for your restaurant.");
              setSubmitting(false);
              return;
            }
            if (!/\d/.test(location.trim()) && location.trim().split(" ").length < 3) {
              appAlert("Invalid Address", "Address should include a street number and street name (e.g. 123 Main St).");
              setSubmitting(false);
              return;
            }
            if (phone.trim() && !/^\+?[\d\s\-().]{7,20}$/.test(phone.trim())) {
              appAlert("Invalid Phone Number", "Please enter a valid business phone number (e.g. +1 555 000 0000).");
              setSubmitting(false);
              return;
            }
            if (businessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
              appAlert("Invalid Email", "Please enter a valid business email address.");
              setSubmitting(false);
              return;
            }
          }
          if (restaurantPostMode === "review") {
            if (!reviewTarget || !reviewN) return;
            await submitReview(reviewTarget.id, { rating: reviewN, content: body.trim() || undefined });
          } else {
            const services = features.length > 0 ? features : ["Dine-in"];
            const tags = [businessType, cuisine].filter((x) => (x || "").trim().length > 0) as string[];
            const waitParsed = parseInt(restWaitTime.trim(), 10);
            const waitOk = !Number.isNaN(waitParsed) && waitParsed > 0;
            const avgPriceParsed = parseInt(avgPricePerPerson.trim(), 10);
            const avgPriceOk = !Number.isNaN(avgPriceParsed) && avgPriceParsed > 0;
            const restaurant = await createRestaurant({
              name: restName.trim(),
              cuisine: cuisine.trim(),
              description: body.trim(),
              address: location.trim(),
              city: restCity.trim(),
              state: restState.trim() || undefined,
              country: restCountry.trim(),
              phoneNumber: phone.trim() || undefined,
              priceRange: mapRestaurantPriceChip(priceRange),
              openingTime: openTime.trim() || undefined,
              closingTime: closeTime.trim() || undefined,
              availableServices: services,
              tags: tags.length ? tags : undefined,
              popularDishes: restTags.map((name, rank) => ({ name, rank: rank + 1 })),
              ...(waitOk ? { waitTimeMinutes: waitParsed } : {}),
              ...(avgPriceOk ? { avgPricePerPerson: avgPriceParsed } : {}),
              // FOD-02: business timezone/currency so every viewer sees the business's own hours and prices.
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
              ...(getBusinessCurrency(null, restCountry) ? { currency: getBusinessCurrency(null, restCountry)!.code } : {}),
            });
            const photoFiles = attachedFiles.filter((f) => f.mediaType === "photo");
            if (photoFiles.length > 0) {
              await uploadRestaurantImages(
                restaurant.id,
                photoFiles.map((f, i) => ({
                  uri: f.uri,
                  name: f.name || `restaurant_${i + 1}.jpg`,
                  type: mimeForListingImage(f.uri),
                })),
              );
            }
          }
          break;
        }
        case "story": {
          const mediaFile = attachedFiles[0];
          if (!mediaFile) break;
          const isPhoto = mediaFile.mediaType === "photo";
          const rawDur = mediaFile.duration;
          const durationSeconds =
            !isPhoto && rawDur != null && Number.isFinite(rawDur)
              ? Math.min(300, Math.max(1, Math.round(rawDur)))
              : undefined;
          const storyHashTagsParsed = storyTagsInput
            ? storyTagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
            : undefined;
          await createStory({
            title: title.trim() || undefined,
            mediaType: mapStoryMediaUi(isPhoto ? "photo" : "video"),
            category: storyCatPick ? mapStoryCategoryLabel(storyCatPick) : undefined,
            details: body.trim() || undefined,
            hashtags: storyHashTagsParsed,
            location: location.trim() || undefined,
            durationSeconds,
            media: { uri: mediaFile.uri, name: mediaFile.name },
          });
          break;
        }
        case "challenge": {
          const maxP = challengeMaxParticipants.trim();
          await createChallenge({
            title: title.trim(),
            type: mapChallengeTypeLabel(challengeType),
            details: body.trim() || undefined,
            duration: mapChallengeDurationLabel(challengeDuration),
            goalCondition: challengeGoal.trim(),
            reward: challengeReward.trim(),
            maxParticipants: (() => {
              if (!maxP) return undefined;
              const n = parseInt(maxP, 10);
              return Number.isNaN(n) ? undefined : n;
            })(),
            hashtags: challengeHashtags.trim() ? splitHashtagInput(challengeHashtags) : undefined,
            location: location.trim() || undefined,
          });
          break;
        }
        default:
          break;
      }

      if (isEditing) { router.back(); return; } // SPRINT-42: return to the subscribed visible surface immediately after a successful PATCH.
      void useSidebarStore.getState().fetchSidebarData();
      appAlert(labels[type.id] ?? "Published! 🎉", "Your content was submitted.", [
        { text: "View", onPress: goAfterPublish },
        { text: "Done", onPress: goAfterPublish },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong. Try again.";
      appAlert("Could not publish", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Build preview extra fields
  const extraFields: { label: string; value: string; icon: string }[] = [];
  if (type.id === "listing") {
    if (propType) extraFields.push({ label: "Type", value: propType, icon: "home-outline" });
    if (price) {
      const parsedPrice = Number(price);
      extraFields.push({
        label: "Price",
        value: `${Number.isFinite(parsedPrice) ? formatPrice(parsedPrice, listingCurrency) : `${derivedListingCurrency.symbol}${price}`}/mo`,
        icon: "cash-outline",
      });
    }
    if (beds) extraFields.push({ label: "Beds", value: beds, icon: "bed-outline" });
    if (baths) extraFields.push({ label: "Baths", value: baths, icon: "water-outline" });
    if (sqft) extraFields.push({ label: "Sqft", value: sqft, icon: "resize-outline" });
    if (petPolicy) extraFields.push({ label: "Pets", value: petPolicy, icon: "paw-outline" });
    if (parking) extraFields.push({ label: "Parking", value: parking, icon: "car-outline" });
    if (available) extraFields.push({ label: "Available", value: available, icon: "calendar-outline" });
    if (laundry) extraFields.push({ label: "Laundry", value: laundry, icon: "shirt-outline" });
    if (heating) extraFields.push({ label: "Heating", value: heating, icon: "flame-outline" });
    if (cooling) extraFields.push({ label: "Cooling", value: cooling, icon: "snow-outline" });
    if (utilitiesText.trim()) extraFields.push({ label: "Utilities", value: utilitiesText.trim(), icon: "flash-outline" });
    if (leaseTerm.trim()) extraFields.push({ label: "Lease", value: leaseTerm.trim(), icon: "document-text-outline" });
    if (neighborhood) extraFields.push({ label: "Neighborhood", value: neighborhood, icon: "map-outline" });
    if (listingFurnishedSwitch) extraFields.push({ label: "Furnished", value: "Yes", icon: "bed-outline" });
  } else if (type.id === "restaurant") {
    if (cuisine) extraFields.push({ label: "Cuisine", value: cuisine, icon: "restaurant-outline" });
    if (priceRange) extraFields.push({ label: "Price", value: priceRange, icon: "cash-outline" });
    if (phone) extraFields.push({ label: "Phone", value: phone, icon: "call-outline" });
  } else if (type.id === "shared_space") {
    if (sharedSpacePrice) {
      const parsedRent = Number(sharedSpacePrice);
      extraFields.push({
        label: "Rent",
        value: `${Number.isFinite(parsedRent) ? formatPrice(parsedRent, listingCurrency) : `${derivedListingCurrency.symbol}${sharedSpacePrice}`}/mo`,
        icon: "cash-outline",
      });
    }
    if (sharedSpaceRooms) extraFields.push({ label: "Rooms", value: sharedSpaceRooms, icon: "home-outline" });
    if (sharedSpaceCity) extraFields.push({ label: "City", value: sharedSpaceCity, icon: "location-outline" });
  } else if (type.id === "event") {
    if (eventDate) extraFields.push({ label: "Date", value: eventDate, icon: "calendar-outline" });
    if (eventTime) extraFields.push({ label: "Time", value: eventTime, icon: "time-outline" });
    if (eventFormat) extraFields.push({ label: "Format", value: eventFormat, icon: "globe-outline" });
    if (ticketType === "Free") extraFields.push({ label: "Tickets", value: "Free", icon: "ticket-outline" });
    else if (ticketPrice) extraFields.push({ label: "Tickets", value: `$${ticketPrice}`, icon: "ticket-outline" });
    if (maxAttendees) extraFields.push({ label: "Capacity", value: maxAttendees, icon: "people-outline" });
  } else if (type.id === "news") {
    if (newsCategory) extraFields.push({ label: "Category", value: newsCategory, icon: "newspaper-outline" });
  } else if (type.id === "story") {
    const f0 = attachedFiles[0];
    if (f0) {
      extraFields.push({
        label: "Media",
        value: f0.mediaType === "video" ? "Video" : "Photo",
        icon: f0.mediaType === "video" ? "videocam-outline" : "image-outline",
      });
    }
  } else if (type.id === "challenge") {
    if (challengeType) extraFields.push({ label: "Type", value: challengeType, icon: "trophy-outline" });
    if (challengeDuration) extraFields.push({ label: "Duration", value: challengeDuration, icon: "time-outline" });
    if (challengeGoal) extraFields.push({ label: "Goal", value: challengeGoal, icon: "flag-outline" });
    if (challengeReward) extraFields.push({ label: "Reward", value: challengeReward, icon: "gift-outline" });
    if (challengeMaxParticipants) extraFields.push({ label: "Max", value: challengeMaxParticipants, icon: "people-outline" });
    if (challengeHashtags) extraFields.push({ label: "Tags", value: challengeHashtags, icon: "pricetag-outline" });
  }

  const storyPreviewMediaType =
    type.id === "story" && attachedFiles[0]?.mediaType === "video" ? "video" : "photo";
  const storyPreviewDuration =
    type.id === "story" &&
    attachedFiles[0]?.mediaType === "video" &&
    attachedFiles[0].duration != null &&
    Number.isFinite(attachedFiles[0].duration)
      ? String(Math.round(attachedFiles[0].duration))
      : "";

  const previewUserName = user?.name?.trim() || "You";
  const previewUserInitials = user?.name?.trim()
    ? user.name.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2)
    : "ME";

  if (editLoading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tc.pageBg }}><ActivityIndicator color={type.color} /><Text style={{ color: tc.textSecondary, marginTop: 10 }}>Loading editor…</Text></View>; // SPRINT-42: prevent editing stale defaults while detail data loads.

  if (type.id === "story" && !isEditing) {
    const m = attachedFiles[0];
    return (
      <StoryComposer
        media={m ? { uri: m.uri, mediaType: m.mediaType === "video" ? "video" : "photo" } : null}
        onPick={handleAttachFile}
        caption={title} onCaption={setTitle}
        topics={STORY_CATEGORY_OPTIONS} topic={storyCatPick} onTopic={setStoryCatPick}
        onShare={() => void handlePost()}
        submitting={submitting}
        onClose={onBack}
      />
    );
  }

  if (type.id === "listing" && !isEditing) {
    const place = [listingCityEff, listingState.trim() || user?.stateProvince?.trim(), listingCountryEff].filter(Boolean).join(", ");
    return (
      <ListingQuestions
        images={listingImages}
        onAddPhotos={handleListingPickImages}
        onRemovePhoto={(idx) => setListingImages((prev) => prev.filter((_, i) => i !== idx))}
        propType={[propType, setPropType]} price={[price, setPrice]} beds={[beds, setBeds]} baths={[baths, setBaths]}
        address={[location, setLocation]} body={[body, setBody]} title={[title, setTitle]}
        currencySymbol={derivedListingCurrency.symbol} currencyCode={(listingCurrency || derivedListingCurrency.code).toUpperCase()}
        placeLine={place}
        extras={{
          deposit: [deposit, setDeposit], available: [available, setAvailable], leaseTerm: [leaseTerm, setLeaseTerm],
          petPolicy: [petPolicy, setPetPolicy], parking: [parking, setParking], laundry: [laundry, setLaundry], sqft: [sqft, setSqft],
          yearBuilt: [yearBuiltStr, setYearBuiltStr], heating: [heating, setHeating], cooling: [cooling, setCooling],
          utilities: [utilitiesText, setUtilitiesText], furnished: [listingFurnishedSwitch, setListingFurnishedSwitch],
        }}
        error={listingStepError}
        validateAddress={() => validateListingStep(3)}
        onPost={() => { setListingStep(4); setListingPostReq((n) => n + 1); }}
        submitting={submitting}
        onClose={onBack}
      />
    );
  }


  // The preview is a route (app/compose-preview.tsx, TR-017); it gets the draft as it is now.
  const showPreview = () =>
    openPreview({
      type,
      title: type.id === "restaurant" ? restName : title,
      body,
      attachedFiles: type.id === "listing" ? listingImages : attachedFiles,
      extraFields,
      location,
      userName: previewUserName,
      userInitials: previewUserInitials,
      storyMediaType: storyPreviewMediaType,
      storyCategory: storyCatPick,
      storyHashtags: storyTagsInput,
      storyDuration: storyPreviewDuration,
      eventDate,
      eventTime,
      eventCategory,
      challengeType,
      challengeDuration,
      challengeGoal,
      challengeReward,
      challengeMaxParticipants,
      challengeHashtags,
      listingPrice: price,
      listingCurrency,
      listingDeposit: deposit,
      listingAvailable: available,
      listingAmenities: amenities,
      listingWalkScore: walkScoreStr,
      listingTransitInfo: transitInfoStr,
      listingIsVerified: isVerifiedLandlord || isVerifiedAgency,
      restCuisine: cuisine,
      restPriceRange: priceRange,
      restFeatures: features,
    });
  return (
    <>
      {/* ── Bar (design D) ── */}
      <View style={{ paddingTop: insetsTop, backgroundColor: tc.glass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.glassLine }}>
        <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
          <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back"
            style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
            <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
          </Pressable>
          <View style={{ position: "absolute", left: 64, right: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }} pointerEvents="none">
            <Ionicons name={type.icon} size={17} color={tc.accentText} />
            <Text style={[TYPE.bar, { color: tc.textPrimary }]} numberOfLines={1}>{type.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════ LISTING FORM ════════ */}
        {type.id === "listing" && (
          <>
            {/* Soft verification boost notice */}
            {canPostListing &&
              !isAdmin &&
              !isVerifiedLandlord &&
              !isVerifiedAgency && (
              <View style={[s.modeLockedNotice, { borderColor: palette.brandGreen, backgroundColor: isDark ? tc.successBg : palette.green50 }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color={palette.green700} />
                <Text style={[s.modeLockedText, { color: isDark ? tc.successText : palette.greenL20 }]}>
                  {"Anyone can list a property — "}
                  <Text style={{ fontWeight: "800" }}>Verified Property Host</Text>
                  {" badge holders get a trust indicator and higher visibility. "}
                  <Text
                    style={{ fontWeight: "800", color: palette.green700, textDecorationLine: "underline" }}
                    onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: "landlord" } })}
                  >Get verified</Text>
                </Text>
              </View>
            )}
            <Text style={{ textAlign: "center", marginBottom: 6, color: tc.textSecondary, fontWeight: "800" }}>
              Step {listingStep} of 4
            </Text>
            {listingStepError ? (
              <Text style={{ color: palette.red600, marginBottom: 10, fontWeight: "600", textAlign: "center" }}>
                {listingStepError}
              </Text>
            ) : null}

            {listingStep === 1 && (
            <>
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Spacious 2BR in Downtown Manhattan"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="PROPERTY TYPE" color={type.color} />
            <ChipSelect
              options={["Apartment", "House", "Studio", "Room"]}
              value={propType}
              onChange={setPropType}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="PRICE & FEES" color={type.color} />
            <View style={s.rowFields}>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>{derivedListingCurrency.symbol}</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Rent/mo"
                    placeholderTextColor={tc.textTertiary}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>{derivedListingCurrency.symbol}</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Deposit"
                    placeholderTextColor={tc.textTertiary}
                    value={deposit}
                    onChangeText={setDeposit}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <SectionLabel label="DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe the property — size, neighborhood, nearby transit, what makes it special..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />
              <Text style={s.charCount}>{body.length}/5000</Text>
            </View>
            </>
            )}

            {listingStep === 2 && (
            <>
            <SectionLabel label="ROOMS & SIZE" color={type.color} />
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Beds</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={beds}
                    onChangeText={setBeds}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Baths</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={baths}
                    onChangeText={setBaths}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Sqft</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={sqft}
                    onChangeText={setSqft}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]} numberOfLines={1}>Floor</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="e.g. 3rd"
                    placeholderTextColor={tc.textTertiary}
                    value={floor}
                    onChangeText={setFloor}
                  />
                </View>
              </View>
            </View>

            <SectionLabel label="AVAILABILITY" color={type.color} />
            <DatePickerField
              value={available}
              onChange={setAvailable}
              placeholder="Select available-from date"
              accentColor={type.color}
              dateFormat="event"
              minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
              style={{ borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
              textStyle={{ color: tc.textPrimary }}
              forceDark={isDark}
            />

            <SectionLabel label="YEAR BUILT (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 2018"
                placeholderTextColor={tc.textTertiary}
                value={yearBuiltStr}
                onChangeText={setYearBuiltStr}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="LEASE TERM (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 12 months, Month-to-month"
                placeholderTextColor={tc.textTertiary}
                value={leaseTerm}
                onChangeText={setLeaseTerm}
              />
            </View>

            <SectionLabel label="FURNISHED" color={type.color} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: tc.cardBg,
                borderWidth: 1,
                borderColor: tc.borderLight,
              }}
            >
              <Text style={{ color: tc.textPrimary, fontWeight: "700" }}>Furnished</Text>
              <Switch
                value={listingFurnishedSwitch}
                onValueChange={setListingFurnishedSwitch}
              />
            </View>

            </>
            )}

            {listingStep === 3 && (
            <>
            <SectionLabel label="PARKING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Street parking, 1 garage spot"
                placeholderTextColor={tc.textTertiary}
                value={parking}
                onChangeText={setParking}
              />
            </View>

            <SectionLabel label="LAUNDRY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. In-unit washer/dryer"
                placeholderTextColor={tc.textTertiary}
                value={laundry}
                onChangeText={setLaundry}
              />
            </View>

            <SectionLabel label="HEATING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Central heat"
                placeholderTextColor={tc.textTertiary}
                value={heating}
                onChangeText={setHeating}
              />
            </View>

            <SectionLabel label="COOLING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Central A/C"
                placeholderTextColor={tc.textTertiary}
                value={cooling}
                onChangeText={setCooling}
              />
            </View>

            <SectionLabel label="UTILITIES" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.bodyInput, { color: tc.textPrimary, minHeight: 44 }]}
                placeholder="e.g. Tenant pays electric & gas"
                placeholderTextColor={tc.textTertiary}
                value={utilitiesText}
                onChangeText={setUtilitiesText}
              />
            </View>

            <SectionLabel label="NEIGHBORHOOD" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="map-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="e.g. Chelsea, Midtown, Williamsburg..."
                placeholderTextColor={tc.textTertiary}
                value={neighborhood}
                onChangeText={setNeighborhood}
              />
            </View>

            <SectionLabel label="CITY" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="City"
                placeholderTextColor={tc.textTertiary}
                value={listingCity}
                onChangeText={setListingCity}
              />
            </View>

            <SectionLabel label="STATE / PROVINCE (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="State or province"
                placeholderTextColor={tc.textTertiary}
                value={listingState}
                onChangeText={setListingState}
              />
            </View>

            <SectionLabel label="COUNTRY" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="Country"
                placeholderTextColor={tc.textTertiary}
                value={listingCountry}
                onChangeText={setListingCountry}
              />
            </View>

            <SectionLabel label="TRANSIT INFO (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 2 min to 6 train"
                placeholderTextColor={tc.textTertiary}
                value={transitInfoStr}
                onChangeText={setTransitInfoStr}
              />
            </View>

            <SectionLabel label="WALK SCORE (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="0–100"
                placeholderTextColor={tc.textTertiary}
                value={walkScoreStr}
                onChangeText={setWalkScoreStr}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="ADDRESS" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Full street address..."
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
            </>
            )}

            {listingStep === 4 && (
            <>
            {isEditing ? <><SectionLabel label="LISTING DETAILS — SAVED WITH BUTTON BELOW" color={type.color} /><SectionLabel label="STATUS" color={type.color} /><ChipSelect options={["AVAILABLE", "RENTED", "UNLISTED"]} value={listingStatus} onChange={(value) => setListingStatus(value as ListingStatus)} color={type.color} bg={type.bg} /></> : null}
            {/* SPRINT-42: separate owner detail/status Save from immediate image operations. */}
            <SectionLabel label="PET POLICY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 72 }]}
                placeholder="e.g. Cats allowed, no dogs"
                placeholderTextColor={tc.textTertiary}
                value={petPolicy}
                onChangeText={setPetPolicy}
                multiline
                textAlignVertical="top"
              />
            </View>

            <SectionLabel label="AMENITIES" color={type.color} />
            <ChipMulti
              options={[
                "Pet Friendly",
                "Gym",
                "Doorman",
                "Rooftop",
                "Pool",
                "Elevator",
                "Wheelchair Accessible",
                "Bike Storage",
                "Storage Unit",
                "Concierge",
                "In-Unit Laundry",
                "Dishwasher",
                "Balcony",
                "Backyard",
                "Parking Included",
              ]}
              value={amenities}
              onChange={setAmenities}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label={isEditing ? "IMAGES — CHANGES APPLY IMMEDIATELY" : "PHOTOS (OPTIONAL, UP TO 6)"} color={type.color} />
            {/* SPRINT-42: explicitly separate image mutations from listing detail Save. */}
            <Pressable
              disabled={imageBusy} // SPRINT-42: prevent overlapping immediate image operations.
              onPress={() => void handleListingPickImages()}
              style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
            >
              <LinearGradient
                colors={type.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.mediaIconCircle}
              >
                <Ionicons name="images-outline" size={22} color={palette.white} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>
                  {existingListingImages.length + listingImages.length > 0 ? "Add more photos" : "Add listing photos"}
                  {/* SPRINT-42: count persisted and staged listing images together. */}
                </Text>
                <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>
                  {existingListingImages.length + listingImages.length}/6 — JPEG, PNG, or WebP · max 5 MiB {/* SPRINT-42: state the enforced format, size, and complete count. */}
                </Text>
              </View>
              <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                <Ionicons name="add" size={16} color={type.color} />
              </View>
            </Pressable>
            {isEditing && existingListingImages.length === 0 ? <Text style={{ color: tc.textSecondary, marginTop: 10 }}>No listing images yet.</Text> : null}
            {/* SPRINT-42: zero images is a valid, calm empty state. */}
            {existingListingImages.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 6 }}>{existingListingImages.map((image, index) => <DraggableListingImage key={image.id} image={image} index={index} count={existingListingImages.length} busy={imageBusy} onMove={(from, to) => void handleMoveExistingListingImage(from, to)} onRemove={() => handleRemoveExistingListingImage(image)} />)}</ScrollView> : null}
            {/* SPRINT-42: render received-order persisted images with actual drag reorder controls. */}
            {listingImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {listingImages.map((f, idx) => (
                    <View key={`${f.uri}-${idx}`} style={{ position: "relative" }}>
                      <FadeImage uri={f.uri} style={{ width: 88, height: 88, borderRadius: 12 }} />
                      {/* SPRINT-42: use shared FadeImage for staged listing media. */}
                      <Pressable
                        onPress={() => setListingImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          backgroundColor: palette.gray900,
                          borderRadius: 12,
                          padding: 4,
                        }}
                      >
                        <Ionicons name="close" size={14} color={palette.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
            </>
            )}

            {type.id === "listing" && (
            <View style={{ marginTop: 16, marginBottom: 28, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {listingStep > 1 ? (
                  <Pressable
                    onPress={() => {
                      setListingStepError(null);
                      setListingStep((s) => Math.max(1, s - 1));
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: tc.borderLight,
                      alignItems: "center",
                      backgroundColor: tc.cardBg,
                    }}
                  >
                    <Text style={{ color: tc.textPrimary, fontWeight: "800" }}>Back</Text>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {listingStep < 4 ? (
                  <Pressable
                    onPress={() => {
                      if (validateListingStep(listingStep)) setListingStep((s) => Math.min(4, s + 1));
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: type.color,
                    }}
                  >
                    <Text style={{ color: palette.white, fontWeight: "800" }}>Next</Text>
                  </Pressable>
                ) : null}
              </View>
              {listingStep === 4 ? (
                <Pressable
                  onPress={canSubmit ? () => void handlePost() : undefined}
                  style={{ opacity: canSubmit ? 1 : 0.45, marginTop: 10 }}
                >
                  <LinearGradient colors={type.gradient} style={s.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {submitting ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <>
                        <Ionicons name="home" size={18} color={palette.white} />
                        <Text style={s.gradientBtnText}>{isEditing ? "Save Changes" : "Publish Listing"}</Text>
                        {/* SPRINT-42: make explicit detail-save behavior clear in edit mode. */}
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : null}
            </View>
            )}
          </>
        )}

        {/* ════════ SHARED SPACE FORM ════════ */}
        {type.id === "shared_space" && (
          <>
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Sunny room in shared Williamsburg loft"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe the space, housemates, vibe, and what you are looking for..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            <SectionLabel label="MONTHLY RENT & FEES" color={type.color} />
            <View style={s.rowFields}>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Rent/mo"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpacePrice}
                    onChangeText={setSharedSpacePrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Deposit"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceDeposit}
                    onChangeText={setSharedSpaceDeposit}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
            <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 8 }]}>Prices in {sharedSpaceCurrency} · from {sharedSpaceCountry.trim() || "your profile"}</Text>

            <SectionLabel label="ROOMS & OCCUPANCY" color={type.color} />
            <Text style={{ fontSize: 12, color: tc.textTertiary, marginTop: -6, marginBottom: 10 }}>
              How many rooms/bathrooms the place has, and how many people live there vs. how many spots are still open.
            </Text>
            <View style={{ gap: 10 }}>
              <Stepper label="Rooms" value={parseInt(sharedSpaceRooms, 10) || 1} onChange={(v) => setSharedSpaceRooms(String(v))} min={1} max={20} />
              <Stepper label="Bathrooms" value={parseInt(sharedSpaceBaths, 10) || 1} onChange={(v) => setSharedSpaceBaths(String(v))} min={1} max={20} />
              <Stepper label="People living there" value={parseInt(sharedSpaceTotalOccupants, 10) || 0} onChange={(v) => setSharedSpaceTotalOccupants(String(v))} min={0} max={30} />
              <Stepper label="Spots open" value={parseInt(sharedSpaceAvailableSpots, 10) || 1} onChange={(v) => setSharedSpaceAvailableSpots(String(v))} min={1} max={20} />
            </View>

            <SectionLabel label="ADDRESS" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Street address"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <SectionLabel label="CITY" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="business-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="City"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceCity}
                onChangeText={setSharedSpaceCity}
              />
            </View>

            <SectionLabel label="STATE / PROVINCE (OPTIONAL)" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="map-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="State or province"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceState}
                onChangeText={setSharedSpaceState}
              />
            </View>

            <SectionLabel label="COUNTRY" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="earth-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Country"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceCountry}
                onChangeText={setSharedSpaceCountry}
              />
            </View>

            <SectionLabel label="PET POLICY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Cats OK, no dogs"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpacePetPolicy}
                onChangeText={setSharedSpacePetPolicy}
              />
            </View>

            <SectionLabel label="SMOKING ALLOWED" color={type.color} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: tc.cardBg,
                borderWidth: 1,
                borderColor: tc.borderLight,
              }}
            >
              <Text style={{ color: tc.textPrimary, fontWeight: "700" }}>Smoking permitted</Text>
              <Switch
                value={sharedSpaceSmoking}
                onValueChange={setSharedSpaceSmoking}
              />
            </View>

            <SectionLabel label="HOUSE RULES (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 88 }]}
                placeholder="Quiet hours, guests, shared spaces..."
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceHouseRules}
                onChangeText={setSharedSpaceHouseRules}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={s.charCount}>{sharedSpaceHouseRules.length}/500</Text>
            </View>

            <SectionLabel label="AMENITIES" color={type.color} />
            <ChipMulti
              options={[
                "Pet Friendly",
                "Gym",
                "Doorman",
                "Rooftop",
                "Pool",
                "Elevator",
                "Wheelchair Accessible",
                "Bike Storage",
                "Storage Unit",
                "Concierge",
                "In-Unit Laundry",
                "Dishwasher",
                "Balcony",
                "Backyard",
                "Parking Included",
              ]}
              value={sharedSpaceAmenities}
              onChange={setSharedSpaceAmenities}
              color={type.color}
              bg={type.bg}
            />
          </>
        )}

        {/* ════════ RESTAURANT FORM ════════ */}
        {type.id === "restaurant" && (
          <>
            {/* Owner or review (design D: two composers; here one segmented control) */}
            <Segmented
              style={{ marginTop: 12, marginBottom: 6 }}
              items={[{ key: "owner", label: "My restaurant" }, { key: "review", label: "A review" }]}
              value={restaurantPostMode}
              onChange={(k) => setRestaurantPostMode(k as typeof restaurantPostMode)}
            />

            {/* ── OWNER FORM ── */}
            {restaurantPostMode === "owner" && (
              <>
                {/* Soft verification boost notice */}
                {canPostRestaurant &&
                  !isAdmin &&
                  !isVerifiedRestaurantOwner && (
                  <Text style={[TYPE.small, { color: tc.textSecondary, marginBottom: 12 }]}>
                    Verified owners get a badge on their posts.{" "}
                    <Text style={{ color: tc.accentText, fontFamily: "Manrope_700Bold" }} onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: "restaurant_owner" } })}>Get verified</Text>
                  </Text>
                )}

                <SectionLabel label="OWNER / MANAGER NAME (OPTIONAL)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="person-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Your full name as owner or manager"
                    placeholderTextColor={tc.textTertiary}
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>

                <SectionLabel label="RESTAURANT NAME *" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[s.titleInput, { color: tc.textPrimary }]}
                    placeholder="e.g. Bella Napoli – Italian Kitchen"
                    placeholderTextColor={tc.textTertiary}
                    value={restName}
                    onChangeText={setRestName}
                    maxLength={100}
                  />
                  <Text style={s.charCount}>{restName.length}/100</Text>
                </View>

                <SectionLabel label="BUSINESS TYPE (OPTIONAL)" color={type.color} />
                <ChipSelect
                  options={["Restaurant", "Café", "Bar & Grill", "Food Truck", "Bakery", "Fast Food", "Fine Dining", "Other"]}
                  value={businessType}
                  onChange={setBusinessType}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="CUISINE TYPE *" color={type.color} />
                <ChipSelect
                  options={["Italian", "Mexican", "Japanese", "Thai", "Indian", "Chinese", "American", "Mediterranean", "Other"]}
                  value={cuisine}
                  onChange={setCuisine}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="PRICE RANGE" color={type.color} />
                <ChipSelect
                  options={["$ Budget", "$$ Mid-range", "$$$ Upscale", "$$$$ Fine Dining"]}
                  value={priceRange}
                  onChange={setPriceRange}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="AVERAGE PRICE PER PERSON (OPTIONAL)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="cash-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="e.g. 25"
                    placeholderTextColor={tc.textTertiary}
                    value={avgPricePerPerson}
                    onChangeText={(t) => setAvgPricePerPerson(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>

                <SectionLabel label="CONTACT DETAILS" color={type.color} />
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="call-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Business phone number"
                    placeholderTextColor={tc.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="mail-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Business email address"
                    placeholderTextColor={tc.textTertiary}
                    value={businessEmail}
                    onChangeText={setBusinessEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="globe-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Website (e.g. https://yourrestaurant.com)"
                    placeholderTextColor={tc.textTertiary}
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="logo-instagram" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="@instagram_handle (optional)"
                    placeholderTextColor={tc.textTertiary}
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                  />
                </View>

                <SectionLabel label="OPENING HOURS" color={type.color} />
                <View style={s.rowFields}>
                  <TimePickerField
                    value={openTime}
                    onChange={setOpenTime}
                    placeholder="Opening time"
                    accentColor={type.color}
                    style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                    textStyle={{ color: tc.textPrimary }}
                    forceDark={isDark}
                  />
                  <TimePickerField
                    value={closeTime}
                    onChange={setCloseTime}
                    placeholder="Closing time"
                    accentColor={type.color}
                    style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                    textStyle={{ color: tc.textPrimary }}
                    forceDark={isDark}
                  />
                </View>

                <SectionLabel label="SERVICES OFFERED" color={type.color} />
                <ChipMulti
                  options={["Dine-in", "Takeout", "Delivery", "Outdoor Seating", "Reservations", "Private Events", "Catering", "BYOB", "Vegan Options", "Halal", "Gluten-Free"]}
                  value={features}
                  onChange={setFeatures}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="SIGNATURE DISHES" color={type.color} />
                <ChipMulti
                  options={["Pizza", "Pasta", "Sushi", "Tacos", "Burgers", "Curry", "Ramen", "Salads", "Cocktails", "Desserts", "Seafood", "Steak", "Brunch"]}
                  value={restTags}
                  onChange={setRestTags}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="TELL YOUR STORY" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
                  <TextInput
                    style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                    placeholder="Tell customers what makes your restaurant unique — your inspiration, ambiance, must-try dishes, and what to expect when they visit..."
                    placeholderTextColor={tc.textTertiary}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                  <Text style={s.charCount}>{body.length}/2000</Text>
                </View>

                <SectionLabel label="RESTAURANT ADDRESS *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="location-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Full business address..."
                    placeholderTextColor={tc.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>

                <SectionLabel label="CITY *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="business-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="City"
                    placeholderTextColor={tc.textTertiary}
                    value={restCity}
                    onChangeText={setRestCity}
                  />
                </View>

                <SectionLabel label="STATE / PROVINCE (Optional)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="map-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="State or province"
                    placeholderTextColor={tc.textTertiary}
                    value={restState}
                    onChangeText={setRestState}
                  />
                </View>

                <SectionLabel label="COUNTRY *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="earth-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Country"
                    placeholderTextColor={tc.textTertiary}
                    value={restCountry}
                    onChangeText={setRestCountry}
                  />
                </View>

                <SectionLabel label="AVERAGE WAIT TIME (minutes, optional)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="hourglass-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="e.g. 20"
                    placeholderTextColor={tc.textTertiary}
                    value={restWaitTime}
                    onChangeText={setRestWaitTime}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            {/* ── COMMUNITY / LOCAL REVIEWER FORM ── */}
            {restaurantPostMode === "review" && (
              <ReviewPicker
                city={user?.city}
                picked={reviewTarget}
                onPick={(r) => { setReviewTarget(r); if (!r) setReviewN(0); }}
                rating={reviewN}
                onRating={setReviewN}
                text={body}
                onText={setBody}
              />
            )}
          </>
        )}

        {/* ════════ EVENT FORM ════════ */}
        {type.id === "event" && (
          <>
            <SectionLabel label="EVENT NAME" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Rooftop Sunset Social Mixer"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="CATEGORY" color={type.color} />
            <ChipSelect
              options={ALL_CATEGORIES}
              scroll
              value={eventCategory}
              onChange={setEventCategory}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="FORMAT" color={type.color} />
            <ChipSelect
              options={["In-Person", "Virtual", "Hybrid"]}
              value={eventFormat}
              onChange={setEventFormat}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="DATE & TIME" color={type.color} />
            <DatePickerField
              value={eventDate}
              onChange={setEventDate}
              placeholder="Select event date"
              accentColor={type.color}
              dateFormat="event"
              minimumDate={new Date()}
              style={{ borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
              forceDark={isDark}
            />
            <View style={[s.rowFields, { marginTop: 8 }]}>
              <TimePickerField
                value={eventTime}
                onChange={setEventTime}
                placeholder="Start time"
                accentColor={type.color}
                style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                textStyle={{ color: tc.textPrimary }}
                forceDark={isDark}
              />
              <TimePickerField
                value={eventEndTime}
                onChange={setEventEndTime}
                placeholder="End time"
                accentColor={type.color}
                style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                textStyle={{ color: tc.textPrimary }}
                forceDark={isDark}
              />
            </View>

            <SectionLabel label="TICKETS" color={type.color} />
            <ChipSelect
              options={["Free", "Paid"]}
              value={ticketType}
              onChange={(v) => setTicketType(v || "Free")}
              color={type.color}
              bg={type.bg}
            />
            {ticketType === "Paid" && (
              <View style={[s.locationField, { marginTop: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                <TextInput
                  style={[s.locationInput, { color: tc.textPrimary }]}
                  placeholder="Ticket price per person"
                  placeholderTextColor={tc.textTertiary}
                  value={ticketPrice}
                  onChangeText={setTicketPrice}
                  keyboardType="numeric"
                />
              </View>
            )}

            <SectionLabel label="CAPACITY (OPTIONAL)" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="people-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Max attendees (leave blank for unlimited)"
                placeholderTextColor={tc.textTertiary}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="EVENT DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe your event — what to expect, who should attend, what to bring..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            <SectionLabel label="VENUE / LOCATION" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Venue name or address"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

        {/* ════════ NEWS FORM ════════ */}
        {/* ── STORY FORM ── */}
        {type.id === "story" && (
          <>
            {/* Title */}
            <SectionLabel label="STORY TITLE *" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Sunset at the harbor 🌅"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* Category */}
            <SectionLabel label="CATEGORY *" color={type.color} />
            <ChipSelect
              options={STORY_CATEGORY_OPTIONS}
              value={storyCatPick}
              onChange={setStoryCatPick}
              color={type.color}
              bg={type.bg}
            />

            {/* Description */}
            <SectionLabel label="DESCRIPTION (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="Tell your community what this story is about…"
                placeholderTextColor={tc.textTertiary}
                multiline
                style={[s.bodyInput, { color: tc.textPrimary }]}
                value={body}
                onChangeText={setBody}
                maxLength={400}
              />
              <Text style={s.charCount}>{body.length}/400</Text>
            </View>

            {/* Hashtags */}
            <SectionLabel label="HASHTAGS (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary }]}
                placeholder="#community, #local, #weekend"
                placeholderTextColor={tc.textTertiary}
                value={storyTagsInput}
                onChangeText={setStoryTagsInput}
                autoCapitalize="none"
              />
            </View>

            {/* Location */}
            <SectionLabel label="LOCATION (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary }]}
                placeholder="e.g. Riverside Park, New York"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

          </>
        )}

        {/* ── CHALLENGE FORM ── */}
        {type.id === "challenge" && (
          <>
            {/* Start from a template (design D `compose-quest`): fills the goal and the reward. */}
            <Text style={[TYPE.label, { color: tc.textSecondary, marginTop: 12, marginBottom: 8 }]}>Start from</Text>
            <View style={{ gap: 8, marginBottom: 6 }}>
              {QUEST_TEMPLATES.map((t) => {
                const on = questTemplate === t.key;
                return (
                  <PressableScale key={t.key} accessibilityRole="button" accessibilityState={{ selected: on }}
                    onPress={() => {
                      setQuestTemplate(t.key);
                      setTitle(t.title); setBody(t.goal); setChallengeReward(t.reward); setChallengeType(t.kind);
                      if (!challengeDuration) setChallengeDuration("1 Week");
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: tc.cardBg, borderWidth: on ? 2 : 1, borderColor: on ? tc.accent : tc.glassLine }}>
                    <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? tc.accent : tc.accentSoft }}>
                      <Ionicons name={t.icon} size={20} color={on ? palette.white : tc.accentText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{t.name}</Text>
                      <Text style={[TYPE.small, { color: tc.textSecondary }]}>{t.sub}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            {/* Challenge Title */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE TITLE</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Best Sunset Shot 🌅"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* Challenge Type */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE TYPE</Text>
            </View>
            <ChipSelect
              options={ALL_CATEGORIES}
              scroll
              value={challengeType}
              onChange={setChallengeType}
              color={type.color}
              bg={type.bg}
            />

            {/* Challenge Details */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE DETAILS</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="What do participants need to do?"
                placeholderTextColor={tc.textTertiary}
                multiline
                style={[s.bodyInput, { color: tc.textPrimary }]}
                value={body}
                onChangeText={setBody}
                maxLength={500}
              />
              <Text style={s.charCount}>{body.length}/500</Text>
            </View>

            {/* Duration */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE DURATION</Text>
            </View>
            <ChipSelect
              options={["1 Day", "3 Days", "1 Week", "2 Weeks", "1 Month"]}
              value={challengeDuration}
              onChange={setChallengeDuration}
              color={type.color}
              bg={type.bg}
            />

            {/* Goal */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>GOAL / WIN CONDITION *</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="e.g. Most likes wins, First to finish, Best photo"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeGoal}
                onChangeText={setChallengeGoal}
              />
            </View>

            {/* Reward */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>REWARD / PRIZE *</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="e.g. Bragging rights 🏆, Gift card, Featured on feed"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeReward}
                onChangeText={setChallengeReward}
              />
            </View>

            {/* Max Participants */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>MAX PARTICIPANTS (OPTIONAL)</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="Leave empty for unlimited"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeMaxParticipants}
                onChangeText={setChallengeMaxParticipants}
                keyboardType="number-pad"
              />
            </View>

            {/* Hashtags */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>HASHTAGS</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                placeholder="#SunsetChallenge, #NYCSunsets, #GoldenHour"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeHashtags}
                onChangeText={setChallengeHashtags}
              />
            </View>

            {/* Location */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>LOCATION</Text>
            </View>
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location" size={18} color={type.color} />
              <TextInput
                placeholder="Where does this challenge happen?"
                placeholderTextColor={tc.textTertiary}
                style={[s.locationInput, { color: tc.textPrimary }]}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

        {type.id === "news" && (
          <>
            {/* ── Title — always visible ── */}
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="What's happening in your community?"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* ── Content — always visible but compact ── */}
            <SectionLabel label="CONTENT" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: "transparent" }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 80 }]}
                placeholder="Share details with your community..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            {/* ── More options toggle ── */}
            <Pressable
              onPress={() => setNewsMoreOpen((p) => !p)}
              style={[s.moreOptionsBtn, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}
            >
              <Ionicons name={newsMoreOpen ? "chevron-up" : "options-outline"} size={17} color={type.color} />
              <Text style={[s.moreOptionsBtnText, { color: type.color }]}>
                {newsMoreOpen ? "Less options" : "More options (category, tags, location)"}
              </Text>
            </Pressable>

            {newsMoreOpen && (
              <>
                <SectionLabel label="CATEGORY" color={type.color} />
                <ChipSelect
                  options={ALL_CATEGORIES}
              scroll
                  value={newsCategory}
                  onChange={setNewsCategory}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="TAGS" color={type.color} />
                <ChipInput value={newsTags} onChange={setNewsTags} placeholder="Type a tag, then space" icon="pricetag-outline" />

                <SectionLabel label="LOCATION (optional)" color={type.color} />
                {user?.city && location.trim() !== user.city ? (
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <Chip label={user.city} icon={<Ionicons name="location" size={14} color={tc.textSecondary} />} onPress={() => setLocation(user.city ?? "")} />
                  </View>
                ) : null}
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="location-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Add a location if relevant"
                    placeholderTextColor={tc.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                    maxLength={200} // SPRINT-42: enforce the feed location PATCH bound in the input.
                  />
                </View>
                <SectionLabel label="SOURCE LABEL (optional)" color={type.color} />
                {/* SPRINT-42: expose sourceLabel in create and edit modes. */}
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                {/* SPRINT-42: match existing optional feed controls. */}
                  <Ionicons name="link-outline" size={17} color={type.color} />
                  {/* SPRINT-42: identify source attribution. */}
                  <TextInput style={[s.locationInput, { color: tc.textPrimary }]} placeholder="e.g. City Council" placeholderTextColor={tc.textTertiary} value={sourceLabel} onChangeText={setSourceLabel} maxLength={100} />
                  {/* SPRINT-42: edit the bounded sourceLabel field. */}
                </View>
                {/* SPRINT-42: close source label field. */}
              </>
            )}
          </>
        )}

        {type.id === "news" && isEditing && ( // SPRINT-42: show persisted post media read-only because media is not PATCH-editable.
          <>
          {/* SPRINT-42: group read-only feed media. */}
            <SectionLabel label="EXISTING MEDIA (READ-ONLY)" color={type.color} />
            {/* SPRINT-42: make media edit behavior explicit. */}
            {attachedFiles.length === 0 ? <Text style={{ color: tc.textSecondary, marginBottom: 12 }}>No existing media.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>{attachedFiles.map((file) => <FadeImage key={file.name} uri={file.uri} style={{ width: 112, height: 88, borderRadius: 12 }} />)}</ScrollView>}
            {/* SPRINT-42: render all existing post images through FadeImage without removal controls. */}
          </> // SPRINT-42: close read-only media group.
        )}
        {/* SPRINT-42: finish edit-only media rendering. */}

        {/* ── Photos (all types except listing and story) ── */}
        {type.id !== "listing" && type.id !== "story" && !(type.id === "news" && isEditing) && ( // SPRINT-42: hide the media picker while editing feed posts.
          <>
            <SectionLabel
              label={type.id === "shared_space" ? "PHOTOS (OPTIONAL, UP TO 6)" : "PHOTOS & VIDEOS"}
              color={type.color}
            />
            {attachedFiles.length > 0 && (
              type.id === "restaurant" || type.id === "shared_space"
                ? <ImageThumbnailStrip
                    files={attachedFiles}
                    onRemove={(i) => setAttachedFiles((p) => p.filter((__, j) => j !== i))}
                  />
                : <View style={{ marginBottom: 8 }}>
                    {attachedFiles.map((file, i) => (
                      <AttachedFile
                        key={i}
                        index={i}
                        color={type.color}
                        bg={type.bg}
                        uri={file.uri}
                        fileName={file.name}
                        mediaType={file.mediaType}
                        duration={file.duration}
                        fileSize={file.fileSize}
                        onRemove={() => setAttachedFiles((p) => p.filter((__, j) => j !== i))}
                      />
                    ))}
                  </View>
            )}
            <Pressable
              style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
              onPress={handleAttachFile}
            >
              <LinearGradient
                colors={type.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.mediaIconCircle}
              >
                <Ionicons name="cloud-upload-outline" size={22} color={palette.white} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>{mediaBtnTitle}</Text>
                <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>{mediaBtnDesc}</Text>
              </View>
              <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                <Ionicons name="add" size={16} color={type.color} />
              </View>
            </Pressable>
          </>
        )}

        {/* ── Photos (Story explicitly) ── */}
        {type.id === "story" && (
          <>
            <SectionLabel label="PHOTO OR VIDEO *" color={type.color} />
            <Text style={{ fontSize: 13, color: tc.textSecondary, marginBottom: 12 }}>
              Pick one photo or one video (up to 2 min). Both are supported.
            </Text>
            {attachedFiles.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                {attachedFiles.map((file, i) => (
                  <AttachedFile
                    key={i}
                    index={i}
                    color={type.color}
                    bg={type.bg}
                    uri={file.uri}
                    fileName={file.name}
                    mediaType={file.mediaType}
                    duration={file.duration}
                    fileSize={file.fileSize}
                    onRemove={() => setAttachedFiles([])}
                  />
                ))}
              </View>
            )}

            {attachedFiles.length === 0 && (
              <>
                <Pressable
                  style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
                  onPress={() => handleAttachSpecificMedia("Images")}
                >
                  <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mediaIconCircle}>
                    <Ionicons name="image-outline" size={22} color={palette.white} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>Add Photo to Story</Text>
                    <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>Gallery or Camera</Text>
                  </View>
                  <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                    <Ionicons name="add" size={16} color={type.color} />
                  </View>
                </Pressable>

                <Pressable
                  style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
                  onPress={() => handleAttachSpecificMedia("Videos")}
                >
                  <LinearGradient colors={[palette.brandGreen, palette.brandGreenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mediaIconCircle}>
                    <Ionicons name="videocam-outline" size={22} color={palette.white} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>Add Video to Story</Text>
                    <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>Gallery or Camera</Text>
                  </View>
                  <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                    <Ionicons name="add" size={16} color={type.color} />
                  </View>
                </Pressable>
              </>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Bottom action bar: Preview + Publish (listing publishes from its own Step 4 button instead) ── */}
      <View style={[s.bottomBar, { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
        <Pressable
          onPress={showPreview}
          style={[s.bottomBarPreviewBtn, { borderColor: tc.borderLight }, type.id === "listing" && { flex: 1 }]}
        >
          <Ionicons name="eye-outline" size={15} color={tc.textSecondary} />
          <Text style={[s.bottomBarPreviewText, { color: tc.textSecondary }]}>Preview</Text>
        </Pressable>
        {type.id !== "listing" && (
          <Pressable
            onPress={canSubmit ? () => void handlePost() : undefined}
            style={[s.bottomBarPublishBtn, { opacity: canSubmit ? 1 : 0.45 }]}
          >
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bottomBarPublishGrad}>
              {submitting ? (
                <ActivityIndicator color={palette.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={
                      type.id === "restaurant" ? "restaurant"
                      : type.id === "event" ? "calendar"
                      : type.id === "story" ? "videocam"
                      : type.id === "challenge" ? "trophy"
                      : type.id === "shared_space" ? "people-circle"
                      : "send"
                    }
                    size={16}
                    color={palette.white}
                  />
                  <Text style={s.bottomBarPublishText}>
                    {type.id === "restaurant"
                      ? restaurantPostMode === "review"
                        ? "Submit Review"
                        : "Add Restaurant"
                      : type.id === "event" ? "Create Event"
                      : type.id === "story" ? "Share Story"
                      : type.id === "challenge" ? "Launch Challenge"
                      : type.id === "shared_space" ? "Publish Space"
                      : "Publish Post"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>


      {/* ── Native media picker sheet (Android) ── */}
      {process.env.EXPO_OS === "android" && (
        <MediaPickerSheet
          visible={pickerSheetVisible}
          onClose={() => setPickerSheetVisible(false)}
          onLibrary={() => { setPickerSheetVisible(false); pickerResolveRef.current?.onLibrary(); }}
          onCamera={() => { setPickerSheetVisible(false); pickerResolveRef.current?.onCamera(); }}
        />
      )}
    </>
  );
}
