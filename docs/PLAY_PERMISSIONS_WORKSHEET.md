# Play Permissions Worksheet

This worksheet records Android permissions found in the current repo inspection. Do not treat it as final Play Console legal advice.

<table>
  <thead>
    <tr>
      <th>Android permission</th>
      <th>Present?</th>
      <th>File where found</th>
      <th>Why it appears to exist</th>
      <th>Required for current build?</th>
      <th>Play disclosure impact</th>
      <th>Recommendation before production</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>android.permission.INTERNET</code></td>
      <td>Yes</td>
      <td><code>android/app/src/main/AndroidManifest.xml</code></td>
      <td>Appears to be present for the Capacitor/WebView Android shell.</td>
      <td>Unclear for the current offline game; likely useful for WebView/dev-test compatibility.</td>
      <td>Non-dangerous permission, but network access should be reviewed for Data safety.</td>
      <td>Keep for now; review before production and retest Android if removal is considered.</td>
    </tr>
  </tbody>
</table>

## Other permissions found

No other `<uses-permission>` entries were found in `android/app/src/main/AndroidManifest.xml` during this inspection.

## Current interpretation

The current game is intended to be offline and local-save only. The inspected repo did not show ads, analytics, billing, login, cloud saves, backend API calls, or intentional transmission of gameplay progress to the developer.

The `INTERNET` permission does not itself prove data collection, but it means the release owner should review the final Android build, dependencies, and Play Data safety declarations before production.

## Do not change in this task

Do not remove `INTERNET` as part of this documentation task. Permission removal should be a separate Android compatibility task with device or emulator verification.
