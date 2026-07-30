import pytest
from app.utils.text_processor import TextProcessor

def test_clean_text_normal():
    # Test whitespace and case normalization for English
    text = "   What is   the CPU?  "
    cleaned = TextProcessor.clean_text(text, language="English")
    assert cleaned == "what is the cpu"

def test_clean_text_hindi():
    # Test that Devanagari characters and vowel matras are preserved
    hindi_text = "ऑपरेटिंग सिस्टम क्या है?"
    cleaned = TextProcessor.clean_text(hindi_text, language="Hindi")
    assert cleaned == "ऑपरेटिंग सिस्टम क्या है"

def test_clean_text_filler_removal():
    # Test that filler words are removed when remove_fillers=True
    text = "uh basically we are learning about like python programming um"
    cleaned = TextProcessor.clean_text(text, language="English", remove_fillers=True)
    assert "uh" not in cleaned
    assert "basically" not in cleaned
    assert "like" not in cleaned
    assert "um" not in cleaned
    assert "python programming" in cleaned

def test_validate_quality_empty():
    # Test empty inputs
    is_valid, remark, score = TextProcessor.validate_transcript_quality("", "")
    assert not is_valid
    assert "empty" in remark.lower()
    assert score == 0.0

def test_validate_quality_too_short():
    # Test answers with fewer than 2 cleaned words (e.g. purely disfluency or 1 word)
    raw = "uh um yes"
    cleaned = TextProcessor.clean_text(raw, language="English", remove_fillers=True) # cleaned is "yes" (1 word)
    is_valid, remark, score = TextProcessor.validate_transcript_quality(raw, cleaned)
    assert not is_valid
    assert "too short" in remark.lower() or "enough meaningful words" in remark.lower()
    assert score == 0.1

def test_validate_quality_repetition():
    # Test word repetition stutter/ASR loop
    raw = "computer computer computer computer computer"
    cleaned = TextProcessor.clean_text(raw, language="English")
    is_valid, remark, score = TextProcessor.validate_transcript_quality(raw, cleaned)
    assert not is_valid
    assert "repetition" in remark.lower()
    assert score == 0.2

def test_validate_quality_gibberish():
    # Test repeating character gibberish
    raw = "aaaaaaa bbbbbbb"
    cleaned = TextProcessor.clean_text(raw, language="English")
    is_valid, remark, score = TextProcessor.validate_transcript_quality(raw, cleaned)
    assert not is_valid
    assert "gibberish" in remark.lower() or "repeating characters" in remark.lower()
    assert score == 0.1

def test_clean_text_multilingual_fillers():
    # Test Hindi filler word removal in Devanagari script
    hindi_text = "ऑपरेटिंग सिस्टम मतलब एक सॉफ्टवेयर है जो यूजर और हार्डवेयर के बीच काम करता है यानी माध्यम है"
    cleaned = TextProcessor.clean_text(hindi_text, language="Hindi", remove_fillers=True)
    assert "मतलब" not in cleaned
    assert "यानी" not in cleaned
    assert "ऑपरेटिंग" in cleaned

def test_extract_concepts_english():
    # Test keyword/concept extraction for English
    text = "The Central Processing Unit or CPU is the brain of a computer."
    concepts = TextProcessor.extract_concepts(text, language="English")
    # Verify stopwords are removed
    assert "the" not in concepts
    assert "is" not in concepts
    assert "cpu" in concepts
    assert "brain" in concepts

def test_extract_concepts_hindi():
    # Test keyword/concept extraction for Hindi
    text = "कंप्यूटर हार्डवेयर और उपयोगकर्ता के बीच इंटरफेस"
    concepts = TextProcessor.extract_concepts(text, language="Hindi")
    # Stopwords like "और", "के", "बीच" should be removed
    assert "और" not in concepts
    assert "के" not in concepts
    assert "बीच" not in concepts
    assert "कंप्यूटर" in concepts
    assert "हार्डवेयर" in concepts
    assert "उपयोगकर्ता" in concepts
