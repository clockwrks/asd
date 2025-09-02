import React, { useState, useEffect } from 'react';
import {
  FormSwitch,
  FormInput,
  FormSection,
  FormDivider,
  FormText,
} from 'enmity/components';

// Define the props for our settings component
interface SettingsProps {
  initialSettings: { active: boolean; targetUserId: string; };
  onSave: (newSettings: any) => void;
}

// This component handles the rendering and state of the settings panel
export default function PluginSettings({ initialSettings, onSave }: SettingsProps): JSX.Element {
  const [localSettings, setLocalSettings] = useState(initialSettings);

  // Update local state when initial settings change from the parent component
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  // Handler for saving settings and applying them
  const handleSave = (newSettings: any) => {
    setLocalSettings(newSettings);
    onSave(newSettings);
  };

  return (
    <FormSection title="NameChanger Settings">
      <FormSwitch
        note="Enable or disable the plugin."
        value={localSettings.active}
        onChange={(val) => handleSave({ ...localSettings, active: val })}
      >
        Enabled
      </FormSwitch>
      <FormDivider />
      <FormInput
        placeholder="Enter a user ID"
        label="Target User ID"
        note="Your display name will change to this user's display name."
        value={localSettings.targetUserId}
        onChange={(val) => setLocalSettings({ ...localSettings, targetUserId: val })}
        onBlur={() => handleSave(localSettings)}
      />
      <FormDivider />
      <FormText>
        After setting the User ID, toggle the "Enabled" switch to apply the changes. You may need to restart Discord for some changes to take effect.
      </FormText>
    </FormSection>
  );
}
