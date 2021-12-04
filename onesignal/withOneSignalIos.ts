/**
 * Expo config plugin for One Signal (iOS)
 * @see https://documentation.onesignal.com/docs/react-native-sdk-setup#step-4-install-for-ios-using-cocoapods-for-ios-apps
 */

import {
  ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} from "@expo/config-plugins";
import { OneSignalPluginProps } from "./withOneSignal";
import fs from 'fs';
import xcode from 'xcode';
import { IPHONEOS_DEPLOYMENT_TARGET, TARGETED_DEVICE_FAMILY } from "../support/iosConstants";

// ---------- ---------- ---------- ----------

/**
 * Add 'app-environment' record with current environment to '<project-name>.entitlements' file
 * @see https://documentation.onesignal.com/docs/react-native-sdk-setup#step-4-install-for-ios-using-cocoapods-for-ios-apps
 */
const withAppEnvironment: ConfigPlugin<OneSignalPluginProps> = (
  config,
  { mode }
) => {
  return withEntitlementsPlist(config, (newConfig) => {
    newConfig.modResults["aps-environment"] = mode;
    return newConfig;
  });
};

/**
 * Add "Background Modes -> Remote notifications" and "App Group" permissions
 * @see https://documentation.onesignal.com/docs/react-native-sdk-setup#step-4-install-for-ios-using-cocoapods-for-ios-apps
 */
const withRemoteNotificationsPermissions: ConfigPlugin<OneSignalPluginProps> = (
  config
) => {
  const BACKGROUND_MODE_KEYS = ["remote-notification"];
  return withInfoPlist(config, (newConfig) => {
    if (!Array.isArray(newConfig.modResults.UIBackgroundModes)) {
      newConfig.modResults.UIBackgroundModes = [];
    }
    for (const key of BACKGROUND_MODE_KEYS) {
      if (!newConfig.modResults.UIBackgroundModes.includes(key)) {
        newConfig.modResults.UIBackgroundModes.push(key);
      }
    }

    return newConfig;
  });
};

/**
 * Add "App Group" permission
 * @see https://documentation.onesignal.com/docs/react-native-sdk-setup#step-4-install-for-ios-using-cocoapods-for-ios-apps (step 4.4)
 */
const withAppGroupPermissions: ConfigPlugin<OneSignalPluginProps> = (
  config
) => {
  const APP_GROUP_KEY = "com.apple.security.application-groups";
  return withEntitlementsPlist(config, (newConfig) => {
    if (!Array.isArray(newConfig.modResults[APP_GROUP_KEY])) {
      newConfig.modResults[APP_GROUP_KEY] = [];
    }
    (newConfig.modResults[APP_GROUP_KEY] as Array<any>).push(
      `group.${newConfig?.ios?.bundleIdentifier || ""}.onesignal`
    );

    return newConfig;
  });
};

const withOneSignalNSE: ConfigPlugin<OneSignalPluginProps> = (config, {
  devTeam,
}) => {
  return withXcodeProject(config, async props => {
    xcodeProjectAddNse(
      props.modRequest.projectName || "",
      props.modRequest.platformProjectRoot,
      props.ios?.bundleIdentifier || "",
      devTeam,
      "node_modules/onesignal-expo-plugin/build/support/serviceExtensionFiles/"
    );

    return props;
  });
}

    const extFiles = [
      "NotificationService.h",
      "NotificationService.m",
      `${targetName}.entitlements`,
      `${targetName}-Info.plist`
    ];

export function xcodeProjectAddNse(
  appName: string,
  iosPath: string,
  bundleIdentifier: string,
  devTeam: string,
  sourceDir: string
): void {
  const projPath = `${iosPath}/${appName}.xcodeproj/project.pbxproj`;
  const targetName = "OneSignalNotificationServiceExtension";

  const extFiles = [
    "NotificationService.h",
    "NotificationService.m",
    `${targetName}.entitlements`,
    `${targetName}-Info.plist`
  ];

  const xcodeProject = xcode.project(projPath);

  xcodeProject.parse(function(err: Error) {
    if (err) {
      console.log(`Error parsing iOS project: ${JSON.stringify(err)}`);
      return;
    }

    // Copy in the extension files
    fs.mkdirSync(`${iosPath}/${targetName}`, { recursive: true });
    extFiles.forEach(function (extFile) {
      let targetFile = `${iosPath}/${targetName}/${extFile}`;

      try {
        fs.createReadStream(`${sourceDir}${extFile}`).pipe(
          fs.createWriteStream(targetFile)
        );
      } catch (err) {
        console.log(err);
      }
    });

    const projObjects = xcodeProject.hash.project.objects;

      // add target
      let target = xcodeProject.addTarget(targetName, "app_extension", targetName, `${props.ios?.bundleIdentifier}.${targetName}`);

      // Add build phases to the new target
      xcodeProject.addBuildPhase(
        ["NotificationService.m"],
        "PBXSourcesBuildPhase",
        "Sources",
        target.uuid
      );
      xcodeProject.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);

      xcodeProject.addBuildPhase(
        [],
        "PBXFrameworksBuildPhase",
        "Frameworks",
        target.uuid
      );

      // Edit the Deployment info of the new Target, only IphoneOS and Targeted Device Family
      // However, can be more
      let configurations = xcodeProject.pbxXCBuildConfigurationSection();
      for (let key in configurations) {
        if (
          typeof configurations[key].buildSettings !== "undefined" &&
          configurations[key].buildSettings.PRODUCT_NAME == `"${targetName}"`
        ) {
          let buildSettingsObj = configurations[key].buildSettings;
          buildSettingsObj.DEVELOPMENT_TEAM = devTeam;
          buildSettingsObj.IPHONEOS_DEPLOYMENT_TARGET = IPHONEOS_DEPLOYMENT_TARGET;
          buildSettingsObj.TARGETED_DEVICE_FAMILY = TARGETED_DEVICE_FAMILY;
          buildSettingsObj.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
          buildSettingsObj.CODE_SIGN_STYLE = "Automatic";
        }
      }
    }

      // Add development teams to both your target and the original project
      xcodeProject.addTargetAttribute("DevelopmentTeam", devTeam, target);
      xcodeProject.addTargetAttribute("DevelopmentTeam", devTeam);

    fs.writeFileSync(projPath, xcodeProject.writeSync());
  })
}
