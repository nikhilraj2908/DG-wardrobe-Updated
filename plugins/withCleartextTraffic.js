const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCleartextTraffic = (config) => {
  // 1. Ensure android:usesCleartextTraffic and android:networkSecurityConfig in AndroidManifest.xml
  config = withAndroidManifest(config, async (manifestConfig) => {
    const androidManifest = manifestConfig.modResults;
    const mainApplication = androidManifest.manifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication.$) {
        mainApplication.$ = {};
      }
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return manifestConfig;
  });

  // 2. Ensure network_security_config.xml is created in android/app/src/main/res/xml
  config = withDangerousMod(config, [
    'android',
    async (dangerConfig) => {
      const resXmlDir = path.join(
        dangerConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }

      const networkSecurityConfigContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">13.127.122.25</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
`;

      fs.writeFileSync(
        path.join(resXmlDir, 'network_security_config.xml'),
        networkSecurityConfigContent,
        'utf8'
      );

      return dangerConfig;
    },
  ]);

  return config;
};

module.exports = withCleartextTraffic;
