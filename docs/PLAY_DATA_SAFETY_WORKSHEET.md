# Play Data Safety Worksheet

This worksheet is a draft for the current inspected repo state. Review it before entering answers in Google Play Console.

<table>
  <thead>
    <tr>
      <th>Data category</th>
      <th>Current repo finding</th>
      <th>Collected/transmitted off device?</th>
      <th>Shared with third parties?</th>
      <th>Purpose</th>
      <th>Evidence from repo</th>
      <th>Draft Play Console answer</th>
      <th>Caveat / review before release</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Personal info</td>
      <td>Login/account collection not found.</td>
      <td>Not found in current repo inspection.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td><code>package.json</code>, <code>src/game.js</code>, prep docs.</td>
      <td>No collection found.</td>
      <td>Review if login, support forms, or account features are added.</td>
    </tr>
    <tr>
      <td>Financial info</td>
      <td>Billing/IAP dependency not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td><code>package.json</code>, prep docs say no IAP/billing.</td>
      <td>No collection found.</td>
      <td>Review before monetisation or billing integration.</td>
    </tr>
    <tr>
      <td>Location</td>
      <td>Location permission/API use not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest has only <code>INTERNET</code>; inspected source has no location call.</td>
      <td>No collection found.</td>
      <td>Review if ads, analytics, or location features are added.</td>
    </tr>
    <tr>
      <td>Photos and videos</td>
      <td>Media capture/access not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected dependencies.</td>
      <td>No collection found.</td>
      <td>Review if sharing, upload, or media features are added.</td>
    </tr>
    <tr>
      <td>Audio</td>
      <td>Microphone/audio capture not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected dependencies.</td>
      <td>No collection found.</td>
      <td>Review if recording or voice features are added.</td>
    </tr>
    <tr>
      <td>Files and documents</td>
      <td>File/document user access not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest includes Capacitor FileProvider but no user document flow found.</td>
      <td>No collection found.</td>
      <td>Review if imports, exports, screenshots, or sharing are added.</td>
    </tr>
    <tr>
      <td>Calendar</td>
      <td>Calendar permission/API use not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected dependencies.</td>
      <td>No collection found.</td>
      <td>Review if calendar features are added.</td>
    </tr>
    <tr>
      <td>Contacts</td>
      <td>Contacts permission/API use not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected dependencies.</td>
      <td>No collection found.</td>
      <td>Review if social/contact features are added.</td>
    </tr>
    <tr>
      <td>App activity</td>
      <td>Local game progress exists.</td>
      <td>Not intentionally transmitted in current repo inspection.</td>
      <td>Not found.</td>
      <td>Continue game progress locally.</td>
      <td><code>src/save.js</code>, <code>src/storage-adapter.js</code>, save lifecycle docs.</td>
      <td>Local-only app activity/save state.</td>
      <td>Play wording may depend on whether local-only progress is treated as collected.</td>
    </tr>
    <tr>
      <td>App info and performance</td>
      <td>Analytics/crash reporting dependency not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td><code>package.json</code> dependencies.</td>
      <td>No collection found.</td>
      <td>Review if crash reporting or analytics SDKs are added.</td>
    </tr>
    <tr>
      <td>Device or other IDs</td>
      <td>Device ID access not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected source.</td>
      <td>No collection found.</td>
      <td>Review if ads, analytics, notifications, or attribution SDKs are added.</td>
    </tr>
    <tr>
      <td>Local game progress</td>
      <td>Save data stored locally.</td>
      <td>No intentional off-device transmission found.</td>
      <td>Not found.</td>
      <td>Persist progress, settings, unlocks, and save state.</td>
      <td><code>src/game.js</code>, <code>src/save.js</code>, storage adapter.</td>
      <td>Local-only data; no off-device collection found.</td>
      <td>Review exact Play Console wording before release.</td>
    </tr>
    <tr>
      <td>Diagnostics/crash data</td>
      <td>Crash/diagnostics SDK not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td><code>package.json</code> dependencies.</td>
      <td>No collection found.</td>
      <td>Review if crash reporting is added by any platform or SDK.</td>
    </tr>
    <tr>
      <td>Purchases</td>
      <td>IAP/billing not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td><code>package.json</code>, prep docs.</td>
      <td>No collection found.</td>
      <td>Review when billing or Play purchases are added.</td>
    </tr>
    <tr>
      <td>User-generated content</td>
      <td>UGC features not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Inspected gameplay/save files.</td>
      <td>No collection found.</td>
      <td>Review if sharing, names, profiles, or uploads are added.</td>
    </tr>
    <tr>
      <td>Messages</td>
      <td>Messaging features not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Inspected source and dependencies.</td>
      <td>No collection found.</td>
      <td>Review if social/messaging features are added.</td>
    </tr>
    <tr>
      <td>Installed apps / device state</td>
      <td>App-list/device-state access not found.</td>
      <td>Not found.</td>
      <td>Not found.</td>
      <td>None in current build.</td>
      <td>Manifest and inspected dependencies.</td>
      <td>No collection found.</td>
      <td>Review if platform plugins or SDKs change.</td>
    </tr>
  </tbody>
</table>

## Current repo summary

- Local-only game progress is intentionally stored on device/browser.
- No repo evidence was found for off-device transmission of personal data to the developer.
- No repo evidence was found for ads, analytics, billing, login, cloud save, backend API calls, or third-party data sharing.
- SDK behavior must be reviewed again if dependencies, Capacitor plugins, Android permissions, or release services change.
