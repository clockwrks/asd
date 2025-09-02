import { Plugin, patcher, webpack } from 'enmity';
import { storage } from 'enmity/api/storage';
import {
  FormSwitch,
  FormInput,
  FormText,
  FormSection,
  FormDivider,
} from 'enmity/components';
import { showToast } from 'enmity/api/toasts';
import React from 'react';

// Define the shape of our plugin settings
interface Settings {
  active: boolean;
  subjectUserId: string;
  targetUserId: string;
}

const defaultSettings: Settings = {
  active: false,
  subjectUserId: '',
  targetUserId: '',
};

// Webpack store lookup - finding the correct stores by their properties.
// This is the Enmity equivalent of BetterDiscord's `Webpack.getStore()`.
let UserStore: any;
let UserProfileStore: any;
let PresenceStore: any;
let GuildMemberStore: any;

const loadStores = async () => {
  try {
    UserStore = webpack.findByProps('getUser', 'getCurrentUser');
    UserProfileStore = webpack.findByProps('getUserProfile');
    PresenceStore = webpack.findByProps('getPrimaryActivity', 'getStatus');
    GuildMemberStore = webpack.findByProps('getMember', 'getMembers');
  } catch (e) {
    showToast({ content: 'Failed to load Discord stores. Imposter plugin will not function correctly.', duration: 3000 });
    console.error('Imposter Plugin Error:', e);
  }
};

const patchAll = (settings: Settings) => {
  if (!UserStore || !UserProfileStore || !PresenceStore || !GuildMemberStore) {
    showToast({ content: 'Could not find required Discord stores. Plugin will not be patched.', duration: 3000 });
    return;
  }
  
  // Patching `getUser` to change the user's basic profile information.
  // This is the Enmity equivalent of BetterDiscord's `Patcher.after`.
  patcher.after(UserStore, 'getUser', (that, args, res) => {
    if (res && args[0] === settings.targetUserId) {
      const subjectUser = UserStore.getUser(settings.subjectUserId);
      if (subjectUser) {
        Object.assign(res, {
          username: subjectUser.username,
          avatar: subjectUser.avatar,
          banner: subjectUser.banner,
          avatarDecorationData: subjectUser.avatarDecorationData,
          id: subjectUser.id,
          globalName: subjectUser.globalName,
          createdAt: subjectUser.createdAt,
        });
      }
    }
  });

  // Patching `getUserProfile` for more detailed profile data.
  patcher.after(UserProfileStore, 'getUserProfile', (that, args, res) => {
    if (res && args[0] === settings.targetUserId) {
      const subjectUser = UserProfileStore.getUserProfile(settings.subjectUserId);
      if (subjectUser) {
        Object.assign(res, {
          badges: subjectUser.badges,
          bio: subjectUser.bio,
          profileEffectId: subjectUser.profileEffectId,
          pronouns: subjectUser.pronouns,
          themeColor: subjectUser.themeColor,
        });
      }
    }
  });

  // Patching `getMutualGuilds` to match the target's mutual guilds.
  patcher.after(UserProfileStore, 'getMutualGuilds', (that, args, res) => {
    if (args && args[0] === settings.targetUserId) {
      const data = UserProfileStore.getMutualGuilds(settings.subjectUserId);
      if (data) {
        return data;
      }
    }
  });

  // Patching `getPrimaryActivity` for the user's status.
  patcher.after(PresenceStore, 'getPrimaryActivity', (that, args, res) => {
    if (args && args[0] === settings.targetUserId) {
      const data = PresenceStore.getPrimaryActivity(settings.subjectUserId);
      if (data) {
        return data;
      }
    }
  });

  // Patching `getMember` for the user's guild-specific data like nickname.
  patcher.after(GuildMemberStore, 'getMember', (that, args, res) => {
    if (res && args && args[1] === settings.targetUserId) {
      const subjectMember = GuildMemberStore.getMember(args[0], settings.subjectUserId);
      const subjectUser = UserStore.getUser(settings.subjectUserId);
      if (subjectUser) {
        Object.assign(res, {
          nick: subjectMember?.nick ?? subjectUser.globalName,
        });
      }
    }
  });
};

export default class ImposterPlugin extends Plugin {
  public settings: Settings = defaultSettings;

  public async onStart(): Promise<void> {
    await loadStores();
    await this.loadSettings();

    if (this.settings.active) {
      patchAll(this.settings);
    }
  }

  public onStop(): void {
    // Unpatching all hooks on plugin stop to clean up resources.
    patcher.unpatchAll();
  }

  // Enmity's settings are handled with a React component.
  public getSettingsPanel({}: any): JSX.Element {
    const [localSettings, setLocalSettings] = React.useState<Settings>(this.settings);
    
    // Asynchronous function to save settings to Enmity's storage.
    const saveSettings = async (newSettings: Settings) => {
      this.settings = newSettings;
      await storage.set(this.manifest.name, 'settings', newSettings);
      
      // Apply or remove patches based on the 'active' state.
      patcher.unpatchAll();
      if (newSettings.active) {
        patchAll(newSettings);
      }
      
      // Update local state for the UI
      setLocalSettings(newSettings);
    };

    return (
      <FormSection title="Imposter Plugin Settings">
        <FormSwitch
          note="Enable or disable the plugin."
          value={localSettings.active}
          onChange={(val) => {
            saveSettings({ ...localSettings, active: val });
          }}
        >
          Enabled
        </FormSwitch>
        <FormDivider />
        <FormInput
          placeholder="User ID"
          label="Subject User ID"
          note="The user to copy the identity from."
          value={localSettings.subjectUserId}
          onChange={(val) => {
            saveSettings({ ...localSettings, subjectUserId: val });
          }}
        />
        <FormInput
          placeholder="User ID"
          label="Target User ID"
          note="The user to apply the identity to."
          value={localSettings.targetUserId}
          onChange={(val) => {
            saveSettings({ ...localSettings, targetUserId: val });
          }}
        />
        <FormDivider />
        <FormText>
          This plugin requires a restart of the Discord app to take full effect on
          user profiles and caches. It can be disabled by toggling the switch
          above.
        </FormText>
      </FormSection>
    );
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = (await storage.get(this.manifest.name, 'settings')) as Settings;
    } catch (e) {
      // If settings are not found, use the default settings
      this.settings = defaultSettings;
    }
  }
}
