/**
 * @name BetterDiscord-Together
 */

/*@cc_on
@if (@_jscript)
	
   // Offer to self-install for clueless users that try to run this directly.
   var shell = WScript.CreateObject("WScript.Shell");
   var fs = new ActiveXObject("Scripting.FileSystemObject");
   var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
   var pathSelf = WScript.ScriptFullName;
   // Put the user at ease by addressing them in the first person
   shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
   if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
      shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
   } else if (!fs.FolderExists(pathPlugins)) {
      shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
   } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
      fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
      // Show the user where to put plugins in the future
      shell.Exec("explorer " + pathPlugins);
      shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
   }
   WScript.Quit();

@else@*/

const { findModuleByProps, findAllModules } = BdApi;
const VCContextMenu = findAllModules(m => m.default && m.default.displayName == 'ChannelListVoiceChannelContextMenu')[0];
const { getVoiceStatesForChannel } = findModuleByProps('getVoiceStatesForChannel');
const DiscordPermissions = findModuleByProps('Permissions').Permissions;
const { getVoiceChannelId } = findModuleByProps('getVoiceChannelId');
const Menu = findModuleByProps('MenuGroup', 'MenuItem');
const Permissions = findModuleByProps('getHighestRole');
const { getChannel } = findModuleByProps('getChannel');
const knownGames = [
    {
        id: "youtube",
        label: "Youtube Together",
        application_id: "755600276941176913"
    },
    {
        id: "poker",
        label: "Poker Night",
        application_id: "755827207812677713"
    },
    {
        id: "betrayal",
        label: "Betrayal.io",
        application_id: "773336526917861400"
    },
    {
        id: "fishing",
        label: "Fishington.io",
        application_id: "814288819477020702"
    },
    {
        id: "chess",
        label: "Chess",
        application_id: "832012586023256104"
    }
];
const { getSelfEmbeddedActivityForChannel } = findModuleByProps("getSelfEmbeddedActivityForChannel");
const { GENERIC_EVENT_EMBEDDED_APPS } = findModuleByProps("GENERIC_EVENT_EMBEDDED_APPS");
const { startEmbeddedActivity } = findModuleByProps("startEmbeddedActivity");
const { transitionTo } = findModuleByProps("transitionTo");
const { Routes } = findModuleByProps("Routes");

const config = {
   info: {
      name: 'BetterDiscord-Together',
      authors: [
         {
            name: 'kikots',
            discord_id: '487773012481933314',
         }
      ],
      version: '1.0.0',
      description: 'A Plugin to Play the new Discord Together Games.',
   }
};

module.exports = !global.ZeresPluginLibrary ? class {
   getName() {
      return config.info.name;
   }

   getAuthor() {
      return config.info.authors[0].name;
   }

   getVersion() {
      return config.info.version;
   }

   getDescription() {
      return config.info.description;
   }

   load() {
      BdApi.showConfirmationModal('Library Missing', `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
         confirmText: 'Download Now',
         cancelText: 'Cancel',
         onConfirm: () => {
            require('request').get('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', async (error, response, body) => {
               if (error) return require('electron').shell.openExternal('https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js');
               await new Promise(r => require('fs').writeFile(require('path').join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js'), body, r));
            });
         }
      });
   }

   start() { }

   stop() { }
} : (([Plugin, API]) => {
   const { Patcher, DiscordModules: { React } } = API;

   return class BetterDiscordTogether extends Plugin {
      constructor() {
         super();
      }
      
      start() {
         Patcher.after(VCContextMenu, 'default', (_, args, res) => {
            const selectedChannel = args[0].channel;

            if (!selectedChannel || !selectedChannel.guild_id || getSelfEmbeddedActivityForChannel(selectedChannel.id)) return res;

            const noNamed = [];

            const items = [];

            Array.from(GENERIC_EVENT_EMBEDDED_APPS).map((application_id, i) => {
                const known = knownGames.find((o) => o.application_id === application_id);
                if (known) {
                    items.push(
                        this.createInviteEl(
                            {
                                id: known.id,
                                label: known.label,
                                application_id
                            },
                            selectedChannel
                        )
                    );
                } else {
                    noNamed.push(
                        this.createInviteEl(
                            {
                                id: `unnamed-${i + 1 - knownGames.length}`,
                                label: `Unnamed${i + 1 - knownGames.length}`,
                                application_id
                            },
                            selectedChannel
                        )
                    );
                }
            });

            if (noNamed.length)
                items.push(
                    React.createElement(Menu.MenuItem, {
                        id: "unnamed-menu",
                        label: "Unnamed Games",
                        children: noNamed
                    })
                );

            res.props.children.splice(
                res.props.children.length - 1,
                0,
                React.createElement(Menu.MenuItem, {
                    id: "discord-together-menu",
                    label: "Discord Together",
                    children: items
                })
            );

            return res;
         });
      };
      createInviteEl(game, selectedChannel) {
        return React.createElement(Menu.MenuItem, {
            id: game.id,
            label: game.label,
            action: async () => {
                await startEmbeddedActivity(selectedChannel.id, game.application_id);

                await transitionTo(Routes.CHANNEL(selectedChannel.guild_id, selectedChannel.id));
            }
        });
    }
      stop() {
         Patcher.unpatchAll();
      };
   };
})(global.ZeresPluginLibrary.buildPlugin(config));