# YouTube Auto-Fetch Setup Guide

This guide will help you set up automatic YouTube video updates on your homepage.

## Overview

The system can automatically fetch the latest video from your YouTube channel and update Video 1 on your homepage at scheduled intervals.

## Admin Dashboard Settings

You now have full control over YouTube video auto-fetching in **Admin Dashboard → Site Settings → YouTube Videos**:

### Settings Available:

1. **YouTube API Key** - Your YouTube Data API v3 key
2. **YouTube Channel ID** - Pre-filled with MECA's channel ID
3. **Enable Automatic Scheduled Updates** - Toggle auto-fetch on/off
4. **Update Frequency** - Choose how often to update:
   - Every Hour
   - Every 6 Hours
   - Once Per Day (default)
5. **Daily Update Time** - Set the time for daily updates (default: 03:00 AM)

## Quick Setup (3 Steps)

### Step 1: Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "MECA YouTube Integration"
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. Copy the API key

### Step 2: Configure in Admin Dashboard

1. Go to **Dashboard → Site Settings**
2. Scroll to **YouTube Videos** section
3. Paste your **API Key**
4. Check **"Enable Automatic Scheduled Updates"**
5. Select frequency: **Once Per Day** (default)
6. Set time: **03:00** (3:00 AM - default)
7. Click **Save All Settings**

### Step 3: Set Up Windows Scheduled Task

**Option A: Automatic Setup (Recommended)**

1. Right-click `scripts/setup-youtube-autofetch-task.bat`
2. Select **"Run as administrator"**
3. Done! Task is created and will run every hour

**Option B: Manual Setup**

1. Open **Task Scheduler** (Windows search → Task Scheduler)
2. Click **"Create Basic Task"**
3. Name: `MECA YouTube Auto-Fetch`
4. Trigger: **Hourly**
5. Action: **Start a program**
6. Program: `node`
7. Arguments: `"E:\MECA Oct 2025\NewMECAV2\scripts\youtube-auto-fetch.js"`
8. Click **Finish**

## How It Works

1. **Scheduled Task runs every hour** (checks the schedule you set)
2. **Checks your settings** in the database
3. **Determines if it's time to fetch** based on:
   - If auto-fetch is enabled
   - Your chosen frequency
   - Time since last fetch
   - Daily time (if using daily frequency)
4. **Fetches latest video** from YouTube API (if it's time)
5. **Updates Video 1** automatically
6. **Records last fetch time**

## Testing

### Test Manual Fetch
1. Go to Admin Dashboard → Site Settings
2. Click **"Fetch Latest Video Now"**
3. Video 1 should update immediately

### Test Auto-Fetch Script
1. Double-click `scripts/run-youtube-autofetch.bat`
2. Watch the console output
3. Check if Video 1 was updated

## Default Configuration

- **Frequency**: Once Per Day
- **Time**: 03:00 AM (3:00 AM)
- **Auto-fetch**: Disabled (you need to enable it)

## Changing Settings

You can change auto-fetch settings anytime:

1. Go to **Admin Dashboard → Site Settings**
2. Modify any YouTube auto-fetch settings
3. Click **Save All Settings**
4. Changes take effect on next scheduled run

## Monitoring

- **Last Update Time** is displayed in the admin dashboard
- Check Task Scheduler to see when the task last ran
- View task history in Task Scheduler → Task History

## Troubleshooting

### Videos not updating?

1. Check if auto-fetch is **enabled** in Site Settings
2. Verify your **API key** is correct
3. Check **Task Scheduler** - ensure task is running
4. Manually run `scripts/run-youtube-autofetch.bat` to see errors

### API Key errors?

1. Verify API key is valid
2. Make sure YouTube Data API v3 is **enabled** in Google Cloud
3. Check API quotas in Google Cloud Console

### Wrong videos showing?

- The script fetches the **latest video** from your channel
- It uses `order=date` to get the most recent
- Check your YouTube channel to verify

## Files Created

- `scripts/youtube-auto-fetch.js` - Main auto-fetch script
- `scripts/setup-youtube-autofetch-task.bat` - Auto-setup for Task Scheduler
- `scripts/run-youtube-autofetch.bat` - Manual test script
- `YOUTUBE_AUTOFETCH_SETUP.md` - This file

## Support

If you need help:
1. Check the console output when running manually
2. Review Task Scheduler history
3. Verify all settings in Admin Dashboard
