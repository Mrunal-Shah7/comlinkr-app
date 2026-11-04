import { useState } from "react";
import {
  Globe,
  Bell,
  Shield,
  Mail,
  Key,
  Database,
  Palette,
  Server,
  Save,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  icon: typeof Globe;
  description: string;
}

const SECTIONS: SettingSection[] = [
  { id: "general", title: "General", icon: Globe, description: "Platform name, URL, and branding" },
  { id: "notifications", title: "Notifications", icon: Bell, description: "Email and push settings" },
  { id: "security", title: "Security", icon: Shield, description: "Authentication and access" },
  { id: "email", title: "Email", icon: Mail, description: "SMTP and email templates" },
  { id: "api", title: "API Keys", icon: Key, description: "Manage API credentials" },
  { id: "database", title: "Database", icon: Database, description: "Backup and maintenance" },
];

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState("general");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Admin Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Configure platform settings and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white text-sm font-semibold rounded-xl hover:shadow-lg transition"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Nav */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 h-fit">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
                activeSection === section.id
                  ? "bg-[#0076EB]/10 text-[#0076EB]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <section.icon className={`w-5 h-5 ${activeSection === section.id ? "text-[#0076EB]" : "text-gray-400"}`} />
              <div>
                <span className="text-sm font-semibold">{section.title}</span>
                <p className="text-[11px] text-gray-400 mt-0.5">{section.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === "general" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Globe className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">General Settings</h3>
              </div>
              <SettingField label="Platform Name" value="ComLinkr" description="The display name of your platform" />
              <SettingField label="Platform URL" value="https://comlinkr.com" description="The main URL of your application" />
              <SettingField label="Support Email" value="support@comlinkr.com" description="Primary contact email for users" />
              <SettingField label="Default City" value="New York" description="Default city for new users" />
              <ToggleSetting label="Maintenance Mode" description="Take the platform offline for maintenance" defaultChecked={false} />
              <ToggleSetting label="Registration Open" description="Allow new user registrations" defaultChecked={true} />
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Bell className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">Notification Settings</h3>
              </div>
              <ToggleSetting label="Email Notifications" description="Send email notifications to users" defaultChecked={true} />
              <ToggleSetting label="Push Notifications" description="Enable browser push notifications" defaultChecked={true} />
              <ToggleSetting label="Admin Alerts" description="Notify admins about flagged content" defaultChecked={true} />
              <ToggleSetting label="Weekly Digest" description="Send weekly summary to users" defaultChecked={false} />
              <ToggleSetting label="New User Welcome Email" description="Send welcome email on registration" defaultChecked={true} />
            </div>
          )}

          {activeSection === "security" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Shield className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">Security Settings</h3>
              </div>
              <ToggleSetting label="Two-Factor Authentication" description="Require 2FA for admin accounts" defaultChecked={true} />
              <ToggleSetting label="Rate Limiting" description="Limit API requests per user" defaultChecked={true} />
              <SettingField label="Session Timeout" value="30" description="Minutes before session expires" suffix="minutes" />
              <SettingField label="Max Login Attempts" value="5" description="Lock account after failed attempts" />
              <ToggleSetting label="Content Moderation AI" description="Auto-flag suspicious content" defaultChecked={true} />
            </div>
          )}

          {activeSection === "email" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Mail className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">Email Configuration</h3>
              </div>
              <SettingField label="SMTP Host" value="smtp.sendgrid.net" description="SMTP server hostname" />
              <SettingField label="SMTP Port" value="587" description="SMTP server port" />
              <SettingField label="From Name" value="ComLinkr" description="Sender name for emails" />
              <SettingField label="From Email" value="noreply@comlinkr.com" description="Sender email address" />
              <SettingField label="SMTP Username" value="apikey" description="SMTP authentication username" />
              <SettingField label="SMTP Password" value="••••••••••••" description="SMTP authentication password" type="password" />
            </div>
          )}

          {activeSection === "api" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Key className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">API Keys</h3>
              </div>
              <ApiKeyRow name="Production API Key" keyValue="clk_prod_••••••••••••4a2f" status="active" created="Jan 1, 2026" />
              <ApiKeyRow name="Staging API Key" keyValue="clk_stg_••••••••••••8b1c" status="active" created="Jan 15, 2026" />
              <ApiKeyRow name="Test API Key" keyValue="clk_test_••••••••••••3d9e" status="revoked" created="Dec 20, 2025" />
              <button className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0076EB] hover:underline">
                + Generate New API Key
              </button>
            </div>
          )}

          {activeSection === "database" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Database className="w-5 h-5 text-[#0076EB]" />
                <h3 className="text-base font-bold text-gray-900">Database & Storage</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <Server className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900">2.4 GB</p>
                  <p className="text-xs text-gray-500">Database Size</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <Palette className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900">8.1 GB</p>
                  <p className="text-xs text-gray-500">Media Storage</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <Database className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900">Feb 12</p>
                  <p className="text-xs text-gray-500">Last Backup</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0076EB] text-white text-sm font-semibold rounded-xl hover:bg-[#0066cc] transition">
                  <Database className="w-4 h-4" />
                  Run Backup Now
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                  Download Last Backup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingField({
  label,
  value,
  description,
  suffix,
  type = "text",
}: {
  label: string;
  value: string;
  description: string;
  suffix?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type={type}
          defaultValue={value}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
        />
        {suffix && <span className="text-sm text-gray-500 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? "bg-[#0076EB]" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function ApiKeyRow({
  name,
  keyValue,
  status,
  created,
}: {
  name: string;
  keyValue: string;
  status: "active" | "revoked";
  created: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500 font-mono mt-1">{keyValue}</p>
        <p className="text-xs text-gray-400 mt-1">Created {created}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${
          status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {status}
        </span>
        {status === "active" && (
          <button className="text-xs font-semibold text-red-600 hover:underline">Revoke</button>
        )}
      </div>
    </div>
  );
}
