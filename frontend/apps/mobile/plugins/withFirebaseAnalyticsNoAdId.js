// apps/mobile/plugins/withFirebaseAnalyticsNoAdId.js
//
// @react-native-firebase/analytics reads the Ruby global $RNFirebaseAnalyticsWithoutAdIdSupport
// from the Podfile to decide whether to link FirebaseAnalytics/IdentitySupport (which collects
// the IDFA and requires Apple's App Tracking Transparency permission). We don't use ad-attribution
// analytics, so this plugin sets that global to true, avoiding the ATT requirement entirely.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '$RNFirebaseAnalyticsWithoutAdIdSupport';

function withFirebaseAnalyticsNoAdId(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes(MARKER)) {
        contents = `${MARKER} = true\n${contents}`;
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
}

module.exports = withFirebaseAnalyticsNoAdId;
