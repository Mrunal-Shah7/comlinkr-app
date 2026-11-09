import { palette } from "../src/theme/palette";
import { rs } from "../src/utils/responsive";
import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LegalDoc } from "../src/shared/d/LegalDoc";

const BRAND_BLUE = palette.brandBlue;
const BRAND_GREEN = palette.brandGreen;

export const TERMS_VERSION = "1.1";
const LAST_UPDATED = "July 7, 2026";

const SECTIONS = [
  {
    id: "acceptance",
    icon: "checkmark-done-outline" as const,
    title: "1. Acceptance of Terms",
    content: [
      {
        subtitle: "1.1 Agreement to These Terms",
        text: "These Terms of Service (\"Terms\") form a binding legal agreement between you and ComLinkr Ltd. (\"ComLinkr,\" \"we,\" \"us,\" or \"our\") governing your access to and use of the ComLinkr mobile application, website, and related services (collectively, the \"Service\"). By creating an account, tapping \"I agree,\" or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.",
      },
      {
        subtitle: "1.2 If You Do Not Agree",
        text: "If you do not agree to any part of these Terms, you must not create an account, access, or otherwise use the Service. Your continued use of the Service after any changes to these Terms constitutes your acceptance of those changes.",
      },
      {
        subtitle: "1.3 Eligibility",
        text: "You must be at least 18 years old to create a ComLinkr account or use the Service. By creating an account, you represent and warrant that: (a) you are at least 18 years of age; (b) you have the legal capacity to enter into a binding contract; (c) you are not barred from using the Service under the laws of your jurisdiction or any other applicable jurisdiction; and (d) all registration information you submit is accurate, current, and complete.",
      },
      {
        subtitle: "1.4 Authority to Bind an Entity",
        text: "If you are using the Service on behalf of a business, restaurant, property management company, or other entity (for example, when listing a restaurant or rental property), you represent that you have the authority to bind that entity to these Terms, and \"you\" will refer to both you individually and that entity.",
      },
      {
        subtitle: "1.5 Changes to Eligibility",
        text: "We may, at our sole discretion, refuse to offer the Service to any person or entity and change our eligibility criteria at any time.",
      },
    ],
  },
  {
    id: "account",
    icon: "person-add-outline" as const,
    title: "2. Your Account",
    content: [
      {
        subtitle: "2.1 Registration",
        text: "To use most features of the Service, you must register for an account using a valid email address, or by signing in through a supported third-party provider (Google or Apple). You agree to provide accurate, current, and complete information during registration and to keep such information updated.",
      },
      {
        subtitle: "2.2 One Account Per Person",
        text: "You may maintain only one personal account, unless we expressly authorize otherwise (for example, a verified business account operated alongside a personal account). Creating multiple accounts to evade a suspension, manipulate reviews or votes, or circumvent any restriction is prohibited.",
      },
      {
        subtitle: "2.3 Account Security",
        text: "You are solely responsible for maintaining the confidentiality of your password and any other login credentials, and for all activities that occur under your account, whether or not you authorized them. You agree to notify us immediately at support@comlinkr.com of any unauthorized use of your account or any other breach of security. We are not liable for any loss or damage arising from your failure to safeguard your credentials.",
      },
      {
        subtitle: "2.4 Age Verification and Misrepresentation",
        text: "We may request proof of age or identity at any time. Providing false information about your age or identity, or impersonating another person, is a material breach of these Terms and grounds for immediate account termination.",
      },
      {
        subtitle: "2.5 Third-Party Sign-In",
        text: "If you register or log in using Google or Apple Sign In, you authorize us to receive and use the profile information those providers share with us (such as your name and email address) in accordance with our Privacy Policy. Your use of those third-party services remains subject to their own terms and privacy policies.",
      },
    ],
  },
  {
    id: "conduct",
    icon: "shield-checkmark-outline" as const,
    title: "3. Community Standards & Zero-Tolerance Policy",
    content: [
      {
        subtitle: "3.1 Zero Tolerance for Objectionable Content",
        text: "ComLinkr has zero tolerance for objectionable content and abusive behavior of any kind. Prohibited content and conduct include, without limitation: harassment, bullying, threats, or intimidation; hate speech or content that attacks or demeans a group based on race, ethnicity, national origin, religion, disability, gender, gender identity, sexual orientation, age, veteran status, or other protected characteristic; graphic violence or content that incites violence; nudity, pornography, or sexually explicit content; content that exploits or endangers minors in any way; discrimination in housing, roommate, or restaurant listings prohibited by fair housing or anti-discrimination law; spam, scams, phishing, or fraudulent listings; impersonation of any person or entity; and any content that is illegal, defamatory, or infringes another person's intellectual property or privacy rights.",
      },
      {
        subtitle: "3.2 Zero Tolerance for Abusive Users",
        text: "Users who post objectionable content, harass or threaten other users, attempt to defraud other users (including rental, roommate, or restaurant scams), or otherwise abuse the Service will have the offending content removed and may have their account suspended or permanently terminated without prior notice and without refund of any fees paid.",
      },
      {
        subtitle: "3.3 Reporting Content and Users",
        text: "Every post, comment, question, answer, review, listing, restaurant, and user profile on ComLinkr includes a Report option. If you encounter content or behavior that violates these Terms, please report it immediately using the in-app Report feature, or email support@comlinkr.com with details. Our Trust & Safety team reviews reports and aims to take appropriate action — which may include content removal, warnings, or account suspension — within 24 hours of receiving a report, and within 4 hours for reports involving imminent safety threats, fraud, or scams.",
      },
      {
        subtitle: "3.4 Blocking Users",
        text: "You may block any other user directly from their profile, or from a menu available on their posts, comments, listings, or messages. Blocking a user immediately prevents them from messaging you, viewing your profile and posts (where technically feasible), and contacting you elsewhere within the Service. You can review and manage blocked users at any time in Settings → Blocked Users.",
      },
      {
        subtitle: "3.5 Enforcement Discretion",
        text: "We reserve full discretion to determine what constitutes a violation of these community standards, to remove content, and to warn, suspend, or permanently ban any account, with or without prior notice, and with or without stating a reason, where we reasonably believe a violation has occurred or that action is necessary to protect the Service or its users.",
      },
      {
        subtitle: "3.6 No Duty to Monitor",
        text: "While we use a combination of automated tools, user reports, and human review to moderate content, we do not and cannot review all content before it is posted. We are not responsible for content posted by users, but we will act on reports and violations we become aware of in accordance with this Section.",
      },
    ],
  },
  {
    id: "content",
    icon: "document-text-outline" as const,
    title: "4. User-Generated Content",
    content: [
      {
        subtitle: "4.1 Your Responsibility",
        text: "\"User Content\" means any text, photos, videos, listings, reviews, comments, questions, answers, messages, or other material you submit, post, or transmit through the Service. You are solely responsible for your User Content and the consequences of posting it. You represent and warrant that you own or have all necessary rights to post your User Content, and that it does not violate these Terms, any applicable law, or any third party's rights (including intellectual property, privacy, and publicity rights).",
      },
      {
        subtitle: "4.2 License You Grant to ComLinkr",
        text: "By posting User Content, you grant ComLinkr a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to host, store, use, display, reproduce, modify (for formatting purposes), distribute, and create derivative works of your User Content solely for the purpose of operating, providing, promoting, and improving the Service. This license ends when you delete the specific content or your account, except to the extent your content was shared with others and they have not deleted it, or where retention is required by law or for legitimate business purposes such as fraud prevention and dispute resolution.",
      },
      {
        subtitle: "4.3 Accuracy of Listings",
        text: "Users who post restaurant listings, housing listings, or roommate listings represent that the information provided (including pricing, availability, photographs, and descriptions) is accurate, current, and not misleading. Posting a fraudulent, duplicate, or materially false listing is strictly prohibited and may result in immediate removal and account suspension.",
      },
      {
        subtitle: "4.4 Reviews and Ratings",
        text: "Reviews must reflect a genuine experience with the restaurant, listing, or user being reviewed. Fake reviews, review manipulation (including offering or accepting incentives for reviews), and posting multiple reviews for the same experience are prohibited. We may remove reviews that violate this policy or these Terms.",
      },
      {
        subtitle: "4.5 Content Removal and Retention",
        text: "We reserve the right, but not the obligation, to review, screen, remove, or refuse any User Content at our sole discretion, at any time and for any reason, including content that we believe violates these Terms, without prior notice to you. Removed content may be retained in our systems as required by law or for safety, fraud-prevention, or legal-compliance purposes even after removal from public view.",
      },
      {
        subtitle: "4.6 Feedback",
        text: "If you send us feedback, suggestions, or ideas about the Service, you grant us an unrestricted, perpetual, irrevocable, royalty-free right to use that feedback for any purpose without any obligation or compensation to you.",
      },
    ],
  },
  {
    id: "housing",
    icon: "home-outline" as const,
    title: "5. Housing, Roommate & Marketplace Listings",
    content: [
      {
        subtitle: "5.1 Not a Party to Transactions",
        text: "ComLinkr provides a platform for users to discover, list, and communicate about housing, roommate arrangements, restaurants, and related local services. ComLinkr is not a party to, and is not responsible for, any lease, rental agreement, roommate arrangement, reservation, purchase, or other transaction or agreement between users. We do not own, manage, inspect, or verify any property, room, or restaurant listed on the Service unless expressly stated otherwise.",
      },
      {
        subtitle: "5.2 Verification Badges",
        text: "Verified Landlord, Verified Property Host, and other trust badges indicate that ComLinkr's Trust & Safety team has completed a specific identity or documentation review at a point in time. A badge is not a guarantee of the accuracy of any listing, the condition of any property, or the trustworthiness of any user's future conduct, and does not create any warranty or agency relationship between ComLinkr and the badge holder.",
      },
      {
        subtitle: "5.3 Security Deposits and Escrow",
        text: "Where the Service facilitates holding a security deposit in escrow pending move-in confirmation, that escrow service is provided as a convenience and is subject to any separate escrow terms presented to you at the time of the transaction. ComLinkr is never entitled to request payment via bank transfer, wire, cryptocurrency, gift cards, or peer-to-peer payment apps outside of the in-app escrow flow, and any user or purported ComLinkr representative asking you to do so is attempting to commit fraud and should be reported immediately.",
      },
      {
        subtitle: "5.4 Reservations",
        text: "Restaurant reservation requests submitted through the Service are requests only and are not confirmed until accepted by the restaurant. ComLinkr is not responsible for a restaurant's failure to honor a reservation, and disputes regarding reservations, seating, or service must be resolved directly with the restaurant.",
      },
      {
        subtitle: "5.5 Your Own Due Diligence",
        text: "You are solely responsible for exercising caution, using good judgment, and conducting your own due diligence — including meeting in safe locations, verifying identities, and inspecting properties in person — before entering into any housing, roommate, or other arrangement with another user. We strongly encourage you never to send money to another user outside of ComLinkr's official in-app payment or escrow flows.",
      },
      {
        subtitle: "5.6 Fair Housing Compliance",
        text: "Housing and roommate listings must comply with all applicable fair housing and anti-discrimination laws. You may not post or respond to a listing in a manner that discriminates against any person on the basis of race, color, religion, sex, national origin, familial status, disability, or any other protected characteristic under applicable law.",
      },
    ],
  },
  {
    id: "messaging",
    icon: "chatbubbles-outline" as const,
    title: "6. Messaging, Notifications & Communications",
    content: [
      {
        subtitle: "6.1 In-App Messaging",
        text: "The Service includes in-app chat to facilitate communication between users regarding listings, reservations, and community topics. Messages are subject to the same Community Standards as other User Content, and may be reviewed by our Trust & Safety team in response to a report or where required to investigate a violation of these Terms, fraud, or a legal obligation.",
      },
      {
        subtitle: "6.2 Push Notifications and Email",
        text: "By using the Service, you consent to receive push notifications and transactional emails related to your account, messages, reservations, and activity on your posts. You can manage notification preferences at any time in Settings → Notifications. We may still send you important service, security, and legal notices even if you disable other notifications.",
      },
      {
        subtitle: "6.3 No Solicitation",
        text: "You may not use ComLinkr's messaging features to send unsolicited commercial messages, chain letters, or spam to other users.",
      },
    ],
  },
  {
    id: "accounts",
    icon: "person-circle-outline" as const,
    title: "7. Suspension, Termination & Account Deletion",
    content: [
      {
        subtitle: "7.1 Termination by You",
        text: "You may stop using the Service at any time. You may permanently delete your account and associated personal data at any time from Settings → Account → Delete Account. Deletion is permanent and cannot be undone once processed; some information may be retained where required by law, for fraud prevention, or to resolve disputes, as described in our Privacy Policy.",
      },
      {
        subtitle: "7.2 Suspension or Termination by ComLinkr",
        text: "We may suspend or terminate your account or access to the Service, with or without notice, if we believe, in our sole discretion, that you have: violated these Terms or our Community Standards; posted objectionable content or engaged in abusive behavior; provided false information during registration; engaged in fraud, scams, or illegal activity; or created risk or possible legal exposure for ComLinkr or other users.",
      },
      {
        subtitle: "7.3 Effect of Termination",
        text: "Upon termination, your right to use the Service ceases immediately. Sections of these Terms that by their nature should survive termination (including ownership, disclaimers, limitations of liability, indemnification, and dispute resolution) will survive.",
      },
      {
        subtitle: "7.4 Appeals",
        text: "If you believe your account was suspended or terminated in error, you may contact support@comlinkr.com to request a review. We will consider appeals in good faith but are not obligated to reverse any enforcement decision.",
      },
    ],
  },
  {
    id: "ip",
    icon: "ribbon-outline" as const,
    title: "8. Intellectual Property",
    content: [
      {
        subtitle: "8.1 ComLinkr's Property",
        text: "The Service, including its design, features, graphics, logos, trademarks, and underlying software, is owned by ComLinkr Ltd. or our licensors and is protected by copyright, trademark, and other intellectual property laws. Except for the limited license to use the app for its intended purpose, these Terms do not grant you any rights to our intellectual property.",
      },
      {
        subtitle: "8.2 Copyright Complaints (DMCA)",
        text: "If you believe content on the Service infringes your copyright, please send a notice to support@comlinkr.com including: identification of the copyrighted work, identification of the allegedly infringing material and its location, your contact information, a statement of good-faith belief that the use is unauthorized, a statement that the notice is accurate under penalty of perjury, and your physical or electronic signature. We will respond to valid notices in accordance with applicable law, including by removing or disabling access to the allegedly infringing content.",
      },
    ],
  },
  {
    id: "disclaimer",
    icon: "information-circle-outline" as const,
    title: "9. Disclaimers",
    content: [
      {
        subtitle: "9.1 \"As-Is\" and \"As-Available\"",
        text: "THE SERVICE IS PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT ANY DEFECTS WILL BE CORRECTED.",
      },
      {
        subtitle: "9.2 No Guarantee of Content Accuracy",
        text: "We do not guarantee the accuracy, completeness, availability, or reliability of any listing, review, profile, or other User Content. Any reliance you place on such content is at your own risk. We are not responsible for the conduct, whether online or offline, of any user of the Service.",
      },
      {
        subtitle: "9.3 Third-Party Services",
        text: "The Service may contain links to or integrations with third-party services (such as maps, payment processors, or social sign-in providers). We do not control and are not responsible for the content, policies, or practices of any third-party service.",
      },
    ],
  },
  {
    id: "liability",
    icon: "warning-outline" as const,
    title: "10. Limitation of Liability",
    content: [
      {
        subtitle: "10.1 Exclusion of Damages",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMLINKR AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE, OR YOUR INTERACTIONS WITH OTHER USERS — WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
      },
      {
        subtitle: "10.2 Cap on Liability",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO COMLINKR, IF ANY, IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).",
      },
      {
        subtitle: "10.3 Essential Purpose",
        text: "Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you. In such cases, our liability will be limited to the maximum extent permitted by applicable law.",
      },
    ],
  },
  {
    id: "indemnification",
    icon: "hand-left-outline" as const,
    title: "11. Indemnification",
    content: [
      {
        subtitle: "11.1 Your Indemnification Obligation",
        text: "You agree to indemnify, defend, and hold harmless ComLinkr and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with: (a) your access to or use of the Service; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any rights of another person or entity, including in connection with any housing, roommate, or restaurant transaction you enter into with another user.",
      },
    ],
  },
  {
    id: "disputes",
    icon: "scale-outline" as const,
    title: "12. Dispute Resolution & Governing Law",
    content: [
      {
        subtitle: "12.1 Informal Resolution First",
        text: "Before filing a claim against ComLinkr, you agree to first contact us at support@comlinkr.com and attempt in good faith to resolve the dispute informally. Most concerns can be resolved this way.",
      },
      {
        subtitle: "12.2 Governing Law",
        text: "These Terms are governed by and construed in accordance with applicable local law, without regard to conflict-of-law principles, except where local consumer-protection law requires application of the law of your country of residence.",
      },
      {
        subtitle: "12.3 Venue",
        text: "Subject to any mandatory consumer-protection rights you may have under local law, any dispute that cannot be resolved informally will be resolved in the courts of competent jurisdiction local to ComLinkr's principal place of business, and you consent to the personal jurisdiction of those courts.",
      },
    ],
  },
  {
    id: "general",
    icon: "settings-outline" as const,
    title: "13. General Provisions",
    content: [
      {
        subtitle: "13.1 Entire Agreement",
        text: "These Terms, together with our Privacy Policy and any additional terms presented to you for specific features, constitute the entire agreement between you and ComLinkr regarding the Service and supersede any prior agreements.",
      },
      {
        subtitle: "13.2 Severability",
        text: "If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.",
      },
      {
        subtitle: "13.3 No Waiver",
        text: "Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision.",
      },
      {
        subtitle: "13.4 Assignment",
        text: "You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. We may assign these Terms without restriction, including in connection with a merger, acquisition, or sale of assets.",
      },
      {
        subtitle: "13.5 Force Majeure",
        text: "We will not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including acts of God, natural disasters, war, terrorism, labor disputes, internet or telecommunications failures, or government action.",
      },
      {
        subtitle: "13.6 Contact Us",
        text: "If you have any questions about these Terms, please contact us at support@comlinkr.com.",
      },
    ],
  },
  {
    id: "changes",
    icon: "refresh-outline" as const,
    title: "14. Changes to These Terms",
    content: [
      {
        subtitle: "14.1 Updates and Versioning",
        text: `These Terms are versioned (current version ${TERMS_VERSION}, last updated ${LAST_UPDATED}). We may revise these Terms from time to time to reflect changes in our Service, legal requirements, or business practices.`,
      },
      {
        subtitle: "14.2 Notice of Material Changes",
        text: "If we make material changes to these Terms, we will notify you through the app, by email, or by another reasonable method, and will update the \"Last updated\" date above. We may also require you to re-accept the Terms before continuing to use the Service.",
      },
      {
        subtitle: "14.3 Continued Use Constitutes Acceptance",
        text: "Your continued access to or use of the Service after any revised Terms take effect constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service and may delete your account as described in Section 7.1.",
      },
    ],
  },
];

export default function TermsOfServiceScreen() {
  return <LegalDoc title="Terms of service" version={TERMS_VERSION} updated={LAST_UPDATED} sections={SECTIONS} />;
}
