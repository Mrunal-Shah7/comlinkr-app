import { Shield, Eye, Database, Lock, Share2, Bell, Trash2, UserCheck, Globe } from "lucide-react";
import PageContainer from "../../../app/layout/PageContainer";

const POLICY_SECTIONS = [
  {
    icon: Database,
    title: "Information We Collect",
    content: `We collect information you provide directly to us, such as when you create an account, update your profile, post content, or contact us for support.

This includes:
• Name, email address, and password
• Profile information (city, interests, dietary preferences)
• Content you post (listings, events, comments)
• Communications with other users
• Device information and usage data`
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: `We use the information we collect to:
• Provide, maintain, and improve our services
• Personalize your experience and content recommendations
• Send you notifications about activity and updates
• Respond to your comments, questions, and requests
• Monitor and analyze trends and usage
• Detect, investigate, and prevent fraudulent or unauthorized activity`
  },
  {
    icon: Share2,
    title: "Information Sharing",
    content: `We do not sell your personal information. We may share your information in the following situations:
• With other users as part of your public profile
• With service providers who assist in our operations
• To comply with legal obligations
• To protect our rights, privacy, safety, or property
• In connection with a merger or acquisition`
  },
  {
    icon: Lock,
    title: "Data Security",
    content: `We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

This includes:
• Encryption of data in transit and at rest
• Regular security assessments
• Access controls and authentication
• Secure data storage practices`
  },
  {
    icon: Globe,
    title: "Cookies & Tracking",
    content: `We use cookies and similar tracking technologies to:
• Remember your preferences and settings
• Understand how you use our services
• Improve our services and user experience
• Provide personalized content

You can control cookies through your browser settings.`
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content: `You have the right to:
• Access your personal information
• Correct inaccurate or incomplete data
• Delete your account and associated data
• Opt out of marketing communications
• Export your data in a portable format
• Withdraw consent at any time`
  },
  {
    icon: Bell,
    title: "Communications",
    content: `We may send you:
• Service-related announcements
• Updates about your account or listings
• Marketing emails (with your consent)

You can manage your notification preferences in Settings > Notifications.`
  },
  {
    icon: Trash2,
    title: "Data Retention",
    content: `We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your account and data at any time through Settings > Delete Account.

Some information may be retained for legal compliance, fraud prevention, or other legitimate purposes.`
  }
];

export default function PrivacyPolicyPage() {
  return (
    <PageContainer>


      <div className="py-5 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0076EB] to-[#0056b3] p-5">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Privacy Matters</h2>
              <p className="text-sm text-white/90">We're committed to protecting your data</p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="p-4 bg-gray-50 rounded-2xl">
          <p className="text-sm text-gray-700 leading-relaxed">
            At ComLinkr, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you use our mobile application and services. 
            Please read this policy carefully.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-4">
          {POLICY_SECTIONS.map((section, idx) => (
            <div key={idx} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-[#0076EB]/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-[#0076EB]" />
                </div>
                <h3 className="font-bold text-gray-900">{section.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact for Privacy */}
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <h4 className="font-semibold text-blue-900 mb-2">Questions About Privacy?</h4>
          <p className="text-sm text-blue-700 mb-3">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="space-y-1">
            <p className="text-sm text-blue-800">📧 privacy@comlinkr.com</p>
            <p className="text-sm text-blue-800">📍 123 Tech Street, San Francisco, CA 94102</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">© 2026 ComLinkr Inc. All rights reserved.</p>
        </div>
      </div>
    </PageContainer>
  );
}
