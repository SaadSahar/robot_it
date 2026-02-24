#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Arabic TTS using edge-tts
This script converts Arabic text to speech using Microsoft Edge's online TTS
"""

import asyncio
import edge_tts
import sys
import os

# Force UTF-8 encoding for stdout/stderr on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# Arabic voices from Microsoft Edge TTS
ARABIC_VOICES = [
    'ar-SA-ZariNeural',      # Female, Saudi Arabia
    'ar-SA-OmarNeural',      # Male, Saudi Arabia
    'ar-EG-SalmaNeural',     # Female, Egypt
    'ar-EG-ShakirNeural',    # Male, Egypt
    'ar-IOR-LaylaNeural',    # Female, Iraq
    'ar-IOR-YoussefNeural',  # Male, Iraq
    'ar-JO-FatimaNeural',    # Female, Jordan
    'ar-JO-SanaNeural',      # Female, Jordan
    'ar-JO-TaimNeural',      # Male, Jordan
    'ar-KW-FahedNeural',     # Male, Kuwait
    'ar-KW-NouraNeural',     # Female, Kuwait
    'ar-LB-LaylaNeural',     # Female, Lebanon
    'ar-LB-RamiNeural',      # Male, Lebanon
    'ar-QA-AmalNeural',      # Female, Qatar
    'ar-QA-MoazNeural',      # Male, Qatar
    'ar-AE-FatimaNeural',    # Female, UAE
    'ar-AE-HamdanNeural',    # Male, UAE
    'ar-YA-MaryamNeural',    # Female, Yemen
    'ar-YA-SalehNeural',     # Male, Yemen
]

# Default voice (Egyptian Female)
DEFAULT_VOICE = 'ar-EG-SalmaNeural'


async def text_to_speech(text, output_file, voice=None, rate='+0%', pitch='+0Hz'):
    """
    Convert text to speech using edge-tts
    
    Args:
        text: The text to convert to speech
        output_file: Path to save the audio file
        voice: The voice to use (default: ar-SA-ZariNeural)
        rate: Speaking rate (default: +0%)
        pitch: Pitch adjustment (default: +0Hz)
    """
    if not text:
        raise ValueError("Text cannot be empty")
    
    # Use default voice if not specified
    if voice is None:
        voice = DEFAULT_VOICE
    
    print(f"[TTS] Using voice: {voice}")
    print(f"[TTS] Text: {text[:50]}...")
    
    # Create the communicate object
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice
    )
    
    # Save audio to file
    await communicate.save(output_file)
    
    print(f"[TTS] Audio saved to: {output_file}")
    
    # Get file size
    file_size = os.path.getsize(output_file)
    print(f"[TTS] File size: {file_size} bytes")
    
    return output_file


async def list_voices():
    """List all available Arabic voices"""
    print("\n=== Available Arabic Voices ===\n")
    
    voices = await edge_tts.list_voices()
    arabic_voices = [v for v in voices if v['Locale'].startswith('ar-')]
    
    for voice in arabic_voices:
        print(f"Name: {voice['Name']}")
        print(f"  Description: {voice['FriendlyName']}")
        print(f"  Gender: {voice['Gender']}")
        print(f"  Locale: {voice['Locale']}")
        print()


async def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python tts_edge.py <text> [output_file] [voice]")
        print("\nExamples:")
        print("  python tts_edge.py 'مرحباً بك' output.mp3")
        print("  python tts_edge.py 'مرحباً بك' output.mp3 ar-SA-ZariNeural")
        print("\nTo list available voices:")
        print("  python tts_edge.py --list-voices")
        sys.exit(1)
    
    # Check if listing voices
    if sys.argv[1] == '--list-voices':
        await list_voices()
        return
    
    # Get parameters
    text = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'output.mp3'
    voice = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_VOICE
    
    try:
        await text_to_speech(text, output_file, voice)
        print(f"\n✅ Success! Audio saved to: {output_file}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
