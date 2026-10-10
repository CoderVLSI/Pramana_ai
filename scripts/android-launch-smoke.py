#!/usr/bin/env python3
"""Launch a packaged APK on an existing emulator and retain actual startup evidence."""
import argparse
import pathlib
import subprocess
import time
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('apk', type=pathlib.Path)
parser.add_argument('--adb', default='adb')
parser.add_argument('--serial', default='emulator-5554')
parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('/tmp/pramana-launch-smoke'))
parser.add_argument('--boot-timeout', type=int, default=600)
parser.add_argument('--launch-timeout', type=int, default=120)
parser.add_argument('--install-timeout', type=int, default=600)
parser.add_argument('--skip-install', action='store_true', help='Test an APK already installed by this workflow.')
parser.add_argument('--install-filter', choices=['verify', 'speed-profile'], help='Optional Android 15 install compiler filter for software emulators.')
args = parser.parse_args()
if not args.serial.startswith('emulator-'):
    parser.error('This smoke test clears app data and only runs on an emulator serial.')
if not args.apk.is_file():
    parser.error('APK file does not exist.')
args.output.mkdir(parents=True, exist_ok=True)
adb = [args.adb, '-s', args.serial]

def command(*values, timeout=30):
    return subprocess.run(adb + list(values), capture_output=True, timeout=timeout)

def text(result):
    return (result.stdout + result.stderr).decode('utf-8', errors='replace')

def save_logs():
    for name, values in [('launch.log', ['logcat', '-d']), ('crash.log', ['logcat', '-d', '-b', 'crash'])]:
        args.output.joinpath(name).write_bytes(command(*values).stdout)
    shot = command('exec-out', 'screencap', '-p', timeout=60)
    if shot.returncode == 0:
        args.output.joinpath('screen.png').write_bytes(shot.stdout)

end = time.monotonic() + args.boot_timeout
while time.monotonic() < end:
    try:
        if command('shell', 'getprop', 'sys.boot_completed', timeout=10).stdout.strip() == b'1':
            break
    except subprocess.TimeoutExpired:
        pass
    time.sleep(3)
else:
    raise SystemExit('FAIL: emulator did not finish booting; no app launch has been verified.')
print('Emulator boot complete.', flush=True)
if not args.skip_install:
    try:
        compiler = ['--dexopt-compiler-filter', args.install_filter] if args.install_filter else []
        result = command('install', '-r', *compiler, str(args.apk.resolve()), timeout=args.install_timeout)
    except subprocess.TimeoutExpired:
        save_logs()
        raise SystemExit('FAIL: installation timed out; app startup has not been tested. See evidence directory.')
    if result.returncode:
        raise SystemExit('FAIL: APK installation: ' + text(result))
    print('APK installed.', flush=True)
command('shell', 'am', 'force-stop', 'org.pramana.study')
command('shell', 'pm', 'clear', 'org.pramana.study')
command('logcat', '-c')
result = command('shell', 'am', 'start', '-W', '-n', 'org.pramana.study/.MainActivity', timeout=120)
args.output.joinpath('activity-start.txt').write_text(text(result))
if result.returncode:
    save_logs()
    raise SystemExit('FAIL: activity could not start. See evidence directory.')
end = time.monotonic() + args.launch_timeout
while time.monotonic() < end:
    time.sleep(5)
    crash = text(command('logcat', '-d', '-b', 'crash'))
    if 'org.pramana.study' in crash:
        save_logs()
        raise SystemExit('FAIL: packaged app crashed. See crash.log in ' + str(args.output))
    dump = command('shell', 'uiautomator', 'dump', '/data/local/tmp/pramana-launch.xml', timeout=60)
    if dump.returncode:
        continue
    xml = command('exec-out', 'cat', '/data/local/tmp/pramana-launch.xml').stdout
    args.output.joinpath('screen.xml').write_bytes(xml)
    try:
        nodes = ET.fromstring(xml).iter('node')
        if any(node.get('text') == 'Welcome to Pramana' for node in nodes):
            # Check again after first render, so an immediate background fatal cannot pass.
            time.sleep(5)
            if not command('shell', 'pidof', 'org.pramana.study').stdout.strip():
                break
            save_logs()
            print('PASS: fresh installed APK reaches onboarding and remains alive. Evidence: ' + str(args.output), flush=True)
            raise SystemExit(0)
    except ET.ParseError:
        pass
save_logs()
raise SystemExit('FAIL: onboarding was not confirmed within the launch deadline. See evidence directory.')
