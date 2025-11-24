#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for fan tachometer
Usage: sudo python3 test_tach.py
"""

import RPi.GPIO as GPIO
import time
import sys

PIN = 14  # GPIO14 = Pin 8
PULSES_PER_REV = 2
UPDATE_INTERVAL = 2.0

pulse_count = 0

def tach_callback(channel):
    """Interrupt handler for tachometer pulses"""
    global pulse_count
    pulse_count += 1

def main():
    global pulse_count

    print("Fan Tachometer Test")
    print("=" * 50)
    print(f"GPIO Pin: {PIN} (BCM mode)")
    print(f"Pulses per revolution: {PULSES_PER_REV}")
    print(f"Update interval: {UPDATE_INTERVAL}s")
    print("=" * 50)
    print("\nPress Ctrl+C to exit\n")

    try:
        # Setup GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.add_event_detect(PIN, GPIO.FALLING,
                              callback=tach_callback,
                              bouncetime=5)

        print("GPIO configured successfully")
        print(f"Pin state: {GPIO.input(PIN)}")
        print("\nWaiting for pulses...\n")

        # Monitor loop
        while True:
            # Reset counter
            pulse_count = 0

            # Wait for measurement interval
            time.sleep(UPDATE_INTERVAL)

            # Calculate RPM
            pulses = pulse_count
            rpm = (pulses / PULSES_PER_REV) * (60 / UPDATE_INTERVAL)

            # Display results
            timestamp = time.strftime("%H:%M:%S")
            print(f"[{timestamp}] Pulses: {pulses:3d} | RPM: {int(rpm):4d}")

    except KeyboardInterrupt:
        print("\n\nStopping...")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        GPIO.cleanup()
        print("GPIO cleaned up")

if __name__ == "__main__":
    if GPIO.RPI_INFO['P1_REVISION'] == 0:
        print("Error: This script must be run on a Raspberry Pi")
        sys.exit(1)

    main()
