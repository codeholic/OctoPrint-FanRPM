# OctoPrint Fan RPM Monitor Plugin

Monitor fan speed via tachometer signal on Raspberry Pi.

## Features

- Real-time RPM monitoring
- Statistics display (current, average, min, max)
- Configurable GPIO pin and update interval
- Visual fan status indicator

## Installation

### Development Mode Installation

```bash
cd /home/if/work/OctoPrint-FanRPM
./reinstall.sh
sudo service octoprint restart
```

### Regular Installation

```bash
pip install https://github.com/codeholic/OctoPrint-FanRPM/archive/main.zip
```

## Fan Wiring

### Tachometer (3-pin or 4-pin fan)

Connect fan tachometer to GPIO14 (Pin 8):

```
Fan Tachometer → GPIO14 (Pin 8)
Fan GND        → GND (Pin 6)
Fan +12V       → External 12V PSU
```

**Important**: Plugin configures GPIO with internal pull-up resistor (`GPIO.PUD_UP`),
suitable for most fans with open-collector tachometer output.

### Wiring Diagram

```
Raspberry Pi          Fan (4-pin)
┌─────────────┐      ┌──────────┐
│ GPIO14 (8)  │◄─────┤ Tach     │
│ GND    (6)  │──────┤ GND      │
└─────────────┘      │ +12V     │◄── External PSU
                     │ PWM      │
                     └──────────┘
```

## Settings

- **Tachometer Pin (BCM)**: GPIO pin for tachometer (default: 14)
- **Pulses per Revolution**: Number of pulses per revolution (usually 2)
- **Update Interval**: Update interval in seconds (default: 2.0)
- **Enable Monitoring**: Enable/disable monitoring

## Debugging

### Check Logs

```bash
tail -f ~/.octoprint/logs/octoprint.log | grep -i fan
```

### Check GPIO

```bash
# Check pin state
gpio -g mode 14 in
gpio -g mode 14 up
gpio -g read 14
```

### Test Tachometer

Use the included test script:

```bash
sudo python3 test_tach.py
```

Or manually with this snippet:

```python
import RPi.GPIO as GPIO
import time

PIN = 14
count = 0

def callback(channel):
    global count
    count += 1

GPIO.setmode(GPIO.BCM)
GPIO.setup(PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.add_event_detect(PIN, GPIO.FALLING, callback=callback, bouncetime=5)

try:
    while True:
        time.sleep(1)
        print(f"Pulses per second: {count}")
        count = 0
except KeyboardInterrupt:
    GPIO.cleanup()
```

### Common Issues

1. **Widget is empty**:
   - Check OctoPrint logs
   - Verify plugin is loaded
   - Check browser console (F12)

2. **RPM = 0**:
   - Verify tachometer connection
   - Ensure fan is spinning
   - Check GPIO pin number is correct

3. **Unstable readings**:
   - Try increasing `bouncetime` in code
   - Check connection quality
   - Verify no electrical interference

## API

### GET /api/plugin/fanrpm

Returns current RPM:

```json
{
  "rpm": 1234
}
```

### WebSocket Messages

Plugin sends updates via WebSocket:

```javascript
{
  "plugin": "fanrpm",
  "data": {
    "rpm": 1234
  }
}
```

## License

AGPLv3
