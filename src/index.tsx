import { Plugin, patcher, webpack } from 'enmity';
import { storage } from 'enmity/api/storage';
import PluginSettings from 'components/settings';
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
    console.log('NameChanger: Plugin starting...');
    // Load the stored settings
    this.settings = (await storage.get(this.manifest.name, 'settings')) || defaultSettings;
    console.log('NameChanger: Loaded settings:', this.settings);

    if (this.settings.active && this.settings.targetUserId) {
      this.applyPatch();
    }
  }

  public onStop(): void {
    console.log('NameChanger: Plugin stopping, unpatching all...');
    // Unpatch all hooks when the plugin is stopped
    patcher.unpatchAll();
  }

  private applyPatch(): void {
    const currentUserId = UserStore.getCurrentUser().id;
    console.log('NameChanger: Applying patch for user ID:', currentUserId);

    // Patch the getMember method in the GuildMemberStore
    // This is the most reliable way to override the displayed nickname
    try {
      patcher.after(GuildMemberStore, 'getMember', (that, args, res) => {
        // Check if the member being fetched is the current user
        if (res && args && args[1] === currentUserId) {
          const targetMember = GuildMemberStore.getMember(args[0], this.settings.targetUserId);
          
          // If the target member exists, change the current user's nickname
          if (targetMember) {
            console.log(`NameChanger: Patching nickname from "${res.nick}" to "${targetMember.nick}"`);
            Object.assign(res, {
              nick: targetMember.nick,
            });
          }
        }
      });
      console.log('NameChanger: Patch applied successfully.');
    } catch (e) {
      console.error('NameChanger: Failed to apply patch.', e);
    }
  }

  // Method to save and apply settings from the UI
  public async saveAndApplySettings(newSettings: Settings): Promise<void> {
    this.settings = newSettings;
    await storage.set(this.manifest.name, 'settings', newSettings);

    // Unpatch existing hooks before applying new ones
    patcher.unpatchAll();
    if (newSettings.active && newSettings.targetUserId) {
      this.applyPatch();
    }
  }

  public getSettingsPanel(): JSX.Element {
    // Pass the current settings and the save handler to the new component
    return <PluginSettings initialSettings={this.settings} onSave={this.saveAndApplySettings.bind(this)} />;
  }
}
