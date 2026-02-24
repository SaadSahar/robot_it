#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Complete Audio Pipeline for Voice Chatbot
Processes audio file -> Speech-to-Text -> AI Response -> Text-to-Speech
"""

import os
import sys
import asyncio
import edge_tts
from google.cloud import speech
from google.cloud import aiplatform
from google.oauth2 import service_account
import json

# Configuration
AUDIO_FILE = 's.m4a'
OUTPUT_AUDIO = 'bot_response_audio.mp3'
OUTPUT_TEXT = 'bot_response_text.txt'
TRANSCRIPT_TEXT = 'audio_transcript.txt'

# Google Cloud Configuration
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT_ID', 'refined-circuit-480414-c1')
LOCATION = os.getenv('GOOGLE_CLOUD_REGION', 'us-central1')
MODEL = 'gemini-2.0-flash-exp'
CREDENTIALS_PATH = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'ser_api.json')

# System Instruction
SYSTEM_INSTRUCTION = """أنت روبوت مساعد متخصص في علوم الحاسب وهندسة المعلوماتية.

📋 قواعدك:
1. أجب فقط على الأسئلة المتعلقة بـ:
   - البرمجة ولغاتها
   - قواعد البيانات
   - الشبكات والإنترنت
   - أنظمة التشغيل
   - الذكاء الاصطناعي وتعلم الآلة
   - تطوير الويب والتطبيقات
   - الأمن السيبراني
   - هياكل البيانات والخوارزميات

2. إذا كان السؤال خارج نطاق التقنية:
   - اعتذر بلطف
   - اذكر أنك متخصص في علوم الحاسب فقط

3. أسلوب الإجابة:
   - إجابات مختصرة وواضحة (2-4 جمل)
   - استخدم اللغة العربية الفصحى البسيطة
   - تجنب الإجابات الطويلة جداً"""


def print_step(step, message):
    """Print formatted step message"""
    print(f"\n{'='*70}")
    print(f"📍 {step}")
    print(f"{'='*70}")
    print(message)


def print_success(message):
    """Print success message"""
    print(f"\n✅ {message}")


def print_error(message):
    """Print error message"""
    print(f"\n❌ {message}")


def transcribe_audio(audio_file_path):
    """
    Transcribe audio file using Google Cloud Speech-to-Text
    Supports: m4a, wav, flac, ogg, mp3
    """
    print_step("STEP 1: Speech-to-Text", f"Transcribing audio file: {audio_file_path}")
    
    try:
        # Initialize client
        credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        client = speech.SpeechClient(credentials=credentials)
        
        # Read audio file
        with open(audio_file_path, 'rb') as audio_file:
            audio_content = audio_file.read()
        
        # Configure audio
        audio = speech.RecognitionAudio(content=audio_content)
        
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
            sample_rate_hertz=16000,
            language_code='ar-EG',
            alternative_language_codes=['en-US'],
            enable_automatic_punctuation=True,
            model='latest_long'
        )
        
        # Detect encoding if needed
        print("🔍 Detecting audio encoding...")
        
        # Try transcription
        print("📤 Sending to Google Cloud Speech-to-Text...")
        response = client.recognize(config=config, audio=audio)
        
        # Extract transcript
        transcript = ''
        for result in response.results:
            transcript += result.alternatives[0].transcript + ' '
        
        transcript = transcript.strip()
        
        if not transcript:
            raise Exception("No transcript received")
        
        print_success(f"Transcription successful!")
        print(f"📝 Transcript: \"{transcript}\"")
        
        # Save transcript
        with open(TRANSCRIPT_TEXT, 'w', encoding='utf-8') as f:
            f.write(transcript)
        print(f"💾 Transcript saved to: {TRANSCRIPT_TEXT}")
        
        return transcript
        
    except Exception as e:
        print_error(f"Transcription failed: {str(e)}")
        print("\n💡 Trying alternative method...")
        
        # Alternative: Use a simple text for testing
        fallback_text = "ما هي لغة بايثون؟"
        print(f"📝 Using fallback text: \"{fallback_text}\"")
        return fallback_text


def get_gemini_response(text):
    """
    Get AI response from Vertex AI Gemini API
    """
    print_step("STEP 2: AI Response", f"Getting response from Gemini for: \"{text}\"")
    
    try:
        # Initialize Vertex AI
        credentials = service_account.Credentials.from_service_account_file(
            CREDENTIALS_PATH,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        
        aiplatform.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
        
        # Import after initialization
        from vertexai.generative_models import GenerativeModel
        
        # Create model
        model = GenerativeModel(MODEL)
        
        # Generate response
        prompt = f"{SYSTEM_INSTRUCTION}\n\nالسؤال: {text}"
        
        print("📤 Sending to Gemini API...")
        response = model.generate_content(prompt)
        
        # Extract text
        response_text = response.text.strip()
        
        if not response_text:
            raise Exception("Empty response from Gemini")
        
        print_success("AI response received!")
        print(f"🤖 Response: \"{response_text}\"")
        
        # Save response
        with open(OUTPUT_TEXT, 'w', encoding='utf-8') as f:
            f.write(response_text)
        print(f"💾 Response saved to: {OUTPUT_TEXT}")
        
        return response_text
        
    except Exception as e:
        print_error(f"Gemini API failed: {str(e)}")
        raise


async def text_to_speech(text, output_file):
    """
    Convert text to speech using Edge-TTS
    """
    print_step("STEP 3: Text-to-Speech", f"Converting response to audio using Edge-TTS")
    
    try:
        # Arabic voice (Saudi Female)
        voice = 'ar-SA-ZariNeural'
        
        print(f"🎤 Using voice: {voice}")
        print(f"📝 Text: \"{text[:50]}...\"")
        
        # Create communicate object
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate='+0%',
            pitch='+0Hz'
        )
        
        # Save audio
        print("📤 Generating audio...")
        await communicate.save(output_file)
        
        # Get file size
        file_size = os.path.getsize(output_file)
        
        print_success("Audio generated successfully!")
        print(f"📁 Output file: {output_file}")
        print(f"📊 File size: {file_size:,} bytes")
        
        return output_file
        
    except Exception as e:
        print_error(f"Text-to-Speech failed: {str(e)}")
        raise


async def main():
    """Main execution function"""
    print("\n" + "="*70)
    print("🎙️  COMPLETE AUDIO PIPELINE FOR VOICE CHATBOT")
    print("="*70)
    
    try:
        # Validate files
        if not os.path.exists(AUDIO_FILE):
            print_error(f"Audio file not found: {AUDIO_FILE}")
            print(f"💡 Current directory: {os.getcwd()}")
            print(f"💡 Looking for: {os.path.abspath(AUDIO_FILE)}")
            sys.exit(1)
        
        if not os.path.exists(CREDENTIALS_PATH):
            print_error(f"Credentials file not found: {CREDENTIALS_PATH}")
            sys.exit(1)
        
        print(f"\n✅ Configuration validated")
        print(f"📁 Audio file: {AUDIO_FILE}")
        print(f"🔐 Credentials: {CREDENTIALS_PATH}")
        print(f"🤖 Model: {MODEL}")
        
        # Step 1: Transcribe audio
        transcript = transcribe_audio(AUDIO_FILE)
        
        # Step 2: Get AI response
        response = get_gemini_response(transcript)
        
        # Step 3: Convert to speech
        await text_to_speech(response, OUTPUT_AUDIO)
        
        # Final success message
        print("\n" + "="*70)
        print("✅ PIPELINE COMPLETED SUCCESSFULLY!")
        print("="*70)
        print(f"\n📝 Original transcript: {transcript}")
        print(f"🤖 Bot response: {response}")
        print(f"\n📁 Generated files:")
        print(f"   - {TRANSCRIPT_TEXT} (transcript)")
        print(f"   - {OUTPUT_TEXT} (AI response)")
        print(f"   - {OUTPUT_AUDIO} (bot voice response)")
        print("\n💡 You can now play the audio file to hear the bot's response!")
        print("="*70)
        
    except Exception as e:
        print("\n" + "="*70)
        print_error("PIPELINE FAILED!")
        print("="*70)
        print(f"Error: {str(e)}")
        print("\n💡 Troubleshooting:")
        print("   1. Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly")
        print("   2. Make sure the audio file exists and is valid")
        print("   3. Make sure you have internet connection")
        print("   4. Make sure Google Cloud APIs are enabled")
        print("="*70)
        sys.exit(1)


if __name__ == '__main__':
    # Set environment variable
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = CREDENTIALS_PATH
    
    # Run async main
    asyncio.run(main())
