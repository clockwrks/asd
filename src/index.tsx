import { Plugin, patcher, webpack } from 'enmity';
import { storage } from 'enmity/api/storage';
import {
  FormSwitch,
  FormInput,
  FormSection,
  FormDivider,
  FormText,
} from 'enmity/components';
import React from 'react';

// Define the shape of our plugin settings
interface Settings {
  active: boolean;
  targetUserId: string;
}

const defaultSettings: Settings = {
  active: false,
  targetUserId: '',
};

// Find Discord's internal stores
const GuildMemberStore = webpack.findByProps('getMember', 'getMembers');
const UserStore = webpack.findByProps('getUser', 'getCurrentUser');

export default class NameChanger extends Plugin {
  public settings: Settings = defaultSettings;

  public async onStart(): Promise<void> {
    // Load the stored settings
    this.settings = (await storage.get(this.manifest.name, 'settings')) || defaultSettings;

    if (this.settings.active && this.settings.targetUserId) {
      this.applyPatch();
    }
  }

  public onStop(): void {
    // Unpatch all hooks when the plugin is stopped
    patcher.unpatchAll();
  }

  private applyPatch(): void {
    const currentUserId = UserStore.getCurrentUser().id;

    // Patch the getMember method in the GuildMemberStore
    patcher.after(GuildMemberStore, 'getMember', (that, args, res) => {
      // Check if the member being fetched is the current user
      if (res && args && args[1] === currentUserId) {
        const targetMember = GuildMemberStore.getMember(args[0], this.settings.targetUserId);
        
        // If the target member exists, change the current user's nickname
        if (targetMember) {
          Object.assign(res, {
            nick: targetMember.nick,
          });
        }
      }
    });
  }

  public getSettingsPanel(): JSX.Element {
    const [localSettings, setLocalSettings] = React.useState<Settings>(this.settings);

    // Function to save and apply settings
    const saveAndApplySettings = async (newSettings: Settings) => {
      this.settings = newSettings;
      await storage.set(this.manifest.name, 'settings', newSettings);

      // Unpatch existing hooks before applying new ones
      patcher.unpatchAll();
      if (newSettings.active && newSettings.targetUserId) {
        this.applyPatch();
      }
      
      setLocalSettings(newSettings);
    };

    return (
      <FormSection title="NameChanger Settings">
        <FormSwitch
          note="Enable or disable the plugin."
          value={localSettings.active}
          onChange={(val) => saveAndApplySettings({ ...localSettings, active: val })}
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
          onBlur={() => saveAndApplySettings(localSettings)}
        />
        <FormDivider />
        <FormText>
          After setting the User ID, toggle the "Enabled" switch to apply the changes. You may need to restart Discord for some changes to take effect.
        </FormText>
      </FormSection>
    );
  }
}
