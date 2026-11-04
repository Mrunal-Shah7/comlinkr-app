import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Mail, Phone, Clock, ChevronRight, HelpCircle, FileText, Shield, Headphones, Send, CheckCircle2 } from "lucide-react";
import PageContainer from "../../../app/layout/PageContainer";

function submitSupportTicket(data: { subject: string; category: string; message: string }) {
  try {
    const currentUser = JSON.parse(localStorage.getItem("comlinkr_user") || "{}");
    const tickets = JSON.parse(localStorage.getItem("comlinkr_support_requests") || "[]");
    tickets.push({
      id: `ticket_${Date.now()}`,
      userId: currentUser.id || "anonymous",
      userName: currentUser.name || "Anonymous",
      email: currentUser.email || "N/A",
      subject: data.subject,
      category: data.category,
      message: data.message,
      priority: "medium",
      createdAt: new Date().toLocaleString(),
    });
    localStorage.setItem("comlinkr_support_requests", JSON.stringify(tickets));
    return true;
  } catch {
    return false;
  }
}

const FAQ_ITEMS = [
  {
    question: "How do I create a listing?",
    answer: "Go to Housing tab, tap the + button, and fill in your property details."
  },
  {
    question: "How do I contact a landlord?",
    answer: "Open any listing and tap the 'Chat' button to start a conversation."
  },
  {
    question: "How do I save listings?",
    answer: "Tap the heart icon on any listing to save it to your favorites."
  },
  {
    question: "How do I change my city?",
    answer: "Go to Settings > Preferences > City to update your location."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use industry-standard encryption to protect your data."
  }
];

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    title: "Email Support",
    description: "support@comlinkr.com",
    action: "mailto:support@comlinkr.com",
    color: "bg-blue-500"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "+1 (555) 123-4567",
    action: "tel:+15551234567",
    color: "bg-green-500"
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Available 9AM - 6PM EST",
    action: null,
    color: "bg-purple-500"
  }
];

const SUPPORT_CATEGORIES = [
  { value: "technical", label: "Technical Issue" },
  { value: "account", label: "Account Problem" },
  { value: "listing", label: "Listing Issue" },
  { value: "billing", label: "Billing / Payment" },
  { value: "abuse", label: "Abuse / Safety" },
  { value: "other", label: "Other" },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      submitSupportTicket({ subject, category, message });
      setSubmitting(false);
      setSubmitted(true);
      setSubject("");
      setMessage("");
      setCategory("technical");
    }, 800);
  };

  return (
    <PageContainer>


      <div className="py-5 space-y-6">
        {/* Support Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0076EB] to-[#26B324] p-5">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Need Help?</h2>
              <p className="text-sm text-white/90">Our team is ready to assist you</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/app/privacy-policy')}
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Privacy Policy</span>
          </button>
          <button 
            onClick={() => window.open('https://comlinkr.com/terms', '_blank')}
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
          >
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Terms of Service</span>
          </button>
        </div>

        {/* Contact Options */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Contact Us</h3>
          <div className="space-y-2">
            {CONTACT_OPTIONS.map((option, idx) => (
              <a
                key={idx}
                href={option.action || '#'}
                onClick={(e) => {
                  if (!option.action) {
                    e.preventDefault();
                    alert('Live chat coming soon!');
                  }
                }}
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition"
              >
                <div className={`w-11 h-11 rounded-xl ${option.color} flex items-center justify-center`}>
                  <option.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{option.title}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </a>
            ))}
          </div>
        </div>

        {/* Submit Ticket */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-5 h-5 text-[#0076EB]" />
            <h3 className="text-sm font-bold text-gray-900">Submit a Support Ticket</h3>
          </div>
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Ticket submitted!</p>
                <p className="text-sm text-green-700 mt-0.5">We'll get back to you within 24 hours. Check your email for updates.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
                >
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue..."
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB] resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white font-semibold text-sm rounded-xl hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Submitting...</span>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Ticket</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* FAQ Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-[#0076EB]" />
            <h3 className="text-sm font-bold text-gray-900">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, idx) => (
              <details key={idx} className="group bg-gray-50 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900 text-sm">{faq.question}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Office Hours */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Support Hours</p>
              <p className="text-sm text-amber-700 mt-1">Monday - Friday: 9:00 AM - 6:00 PM EST</p>
              <p className="text-sm text-amber-700">Saturday: 10:00 AM - 2:00 PM EST</p>
              <p className="text-sm text-amber-700">Sunday: Closed</p>
            </div>
          </div>
        </div>

        {/* App Version */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">ComLinkr v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">© 2026 ComLinkr. All rights reserved.</p>
        </div>
      </div>
    </PageContainer>
  );
}
