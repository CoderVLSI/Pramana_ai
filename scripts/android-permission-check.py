#!/usr/bin/env python3
"""Check the shipped APK, because config plugins can remove merged permissions."""
import argparse, subprocess
p = argparse.ArgumentParser()
p.add_argument('apk')
p.add_argument('--aapt', required=True)
a = p.parse_args()
output = subprocess.check_output([a.aapt, 'dump', 'permissions', a.apk], text=True)
required = ['android.permission.INTERNET', 'android.permission.RECORD_AUDIO', 'android.permission.POST_NOTIFICATIONS']
missing = [permission for permission in required if "uses-permission: name='" + permission + "'" not in output]
if missing:
    raise SystemExit('FAIL: APK is missing required permissions: ' + ', '.join(missing))
print('PASS: packaged APK declares internet, microphone and notification permissions.')
