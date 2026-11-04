import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SectionHeader from "../../../app/layout/SectionHeader";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import Input from "../../../shared/ui/Input";
import { getProfile, setProfile } from "../../../shared/lib/storage";
import { useToast } from "../../../shared/ui/Toast";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const stored = getProfile();
  const [name, setName] = useState(stored?.name ?? "ComLinkr User");
  const [city, setCity] = useState(stored?.city ?? "");
  const [culture, setCulture] = useState(stored?.culture.join(", ") ?? "");
  const [interests, setInterests] = useState(stored?.interests.join(", ") ?? "");

  const handleSave = () => {
    setProfile({
      name,
      city,
      culture: culture.split(",").map((item) => item.trim()).filter(Boolean),
      interests: interests.split(",").map((item) => item.trim()).filter(Boolean),
    });
    notify("Profile updated");
    navigate("/app/profile");
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Edit Profile" />
      <Card className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input
          label="Culture (comma separated)"
          value={culture}
          onChange={(e) => setCulture(e.target.value)}
        />
        <Input
          label="Interests (comma separated)"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
        <Button variant="primary" tone="blue" onClick={handleSave}>
          Save changes
        </Button>
      </Card>
    </div>
  );
}
