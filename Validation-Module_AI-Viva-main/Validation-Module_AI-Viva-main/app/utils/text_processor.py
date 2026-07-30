import regex
import logging
from typing import List, Set, Tuple

logger = logging.getLogger("validation-module.text-processor")

# Comprehensive multilingual filler words (covering English, transliterated, and native scripts)
MULTILINGUAL_FILLERS: Set[str] = {
    # English & transliterated
    "uh", "um", "ah", "like", "you know", "i mean", "so", "actually", "basically",
    "ya", "na", "matlab", "yani", "ki", "he na", "hai na", "right", "okay", "acha", "achha", "toh",
    # Native Hindi/Bengali scripts
    "मतलब", "यानी", "है ना", "तो", "अच्छा", "ना", "यार", "মানে", "হৈ না"
}

# Standard stopwords for English and major Indian languages
ENGLISH_STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have",
    "havent", "having", "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him",
    "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt",
    "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some",
    "such", "than", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "there",
    "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent",
    "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why",
    "whys", "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours",
    "yourself", "yourselves"
}

INDIAN_STOP_WORDS: Set[str] = {
    # Hindi
    "के", "में", "की", "है", "और", "से", "का", "को", "एक", "हैं", "कि", "यह", "इस", "भी", "पर", 
    "हो", "कर", "तो", "ही", "या", "था", "थे", "थी", "होने", "करने", "रहे", "रहा", "रही", 
    "लिए", "गया", "गए", "गई", "दिया", "दिए", "दी", "ले", "ली", "लिया", "जा", "जाता", "जाते", "जाती", "बीच",
    # Bengali
    "ও", "এবং", "কিন্তু", "অথবা", "হচ্ছে", "হলো", "হয়", "হল", "করা", "করতে", "করে", "হয়ে", 
    "হলে", "থেকে", "চেয়ে", "মধ্যে", "জন্য", "এর", "একটি", "এই", "সেই", "তারা", "আমরা", 
    "তুমি", "আমি", "সে", "তার", "আমার", "আমাদের", "আপনার", "আপনাদের",
    # Tamil
    "மற்றும்", "ஆனால்", "அல்லது", "ஒரு", "இந்த", "அந்த", "அவர்", "அவர்கள்", "நான்", 
    "நாம்", "நீ", "நீங்கள்", "அவன்", "அவள்", "அது", "என்", "எங்கள்", "உன்", "உங்கள்"
}

ALL_STOP_WORDS = ENGLISH_STOP_WORDS.union(INDIAN_STOP_WORDS)

class TextProcessor:
    """
    Utility class for text cleaning, preprocessing, and transcript quality checks.
    """

    @staticmethod
    def clean_text(text: str, language: str = "English", remove_fillers: bool = False) -> str:
        """
        Cleans and normalizes the transcription text.
        - Trims spaces and normalizes whitespaces.
        - Lowers casing if the language is English-centric.
        - Strips punctuation except apostrophes.
        - Preserves unicode characters and combining marks (matras) for Indian languages.
        - Optionally filters out common multilingual fillers.
        """
        if not text:
            return ""

        cleaned = text.strip()
        lang_lower = language.lower()

        # Lowercase English text
        if "english" in lang_lower:
            cleaned = cleaned.lower()

        # Normalize whitespace (replace newlines/tabs/multiple spaces with a single space)
        cleaned = regex.sub(r"\s+", " ", cleaned)

        # Remove punctuation but preserve internal word contractions and unicode letters/numbers/marks
        # \p{L} = letters, \p{N} = numbers, \p{M} = combining marks (matras/halants), \s = whitespace
        cleaned = regex.sub(r"[^\p{L}\p{N}\p{M}\s']", "", cleaned)
        cleaned = regex.sub(r"\s+", " ", cleaned).strip()

        # Optional filler word filtering
        if remove_fillers:
            # 1. Replace multi-word filler phrases using word boundaries
            multi_word_fillers = [f for f in MULTILINGUAL_FILLERS if " " in f]
            cleaned_temp = cleaned
            for filler in sorted(multi_word_fillers, key=len, reverse=True):
                cleaned_temp = regex.sub(rf"\b{filler}\b", "", cleaned_temp)
                
            # 2. Filter out single-word fillers
            words = cleaned_temp.split()
            single_word_fillers = {f for f in MULTILINGUAL_FILLERS if " " not in f}
            words = [w for w in words if w not in single_word_fillers]
            cleaned = " ".join(words)

        return cleaned

    @staticmethod
    def extract_concepts(text: str, language: str = "English") -> List[str]:
        """
        Extracts key words/concepts from reference text by tokenizing, 
        cleaning, and filtering out language-specific stopwords and short words.
        """
        cleaned = TextProcessor.clean_text(text, language, remove_fillers=False)
        words = cleaned.split()
        
        concepts = []
        seen = set()
        for w in words:
            is_numeric = w.isdigit()
            # Allow words that are not stopwords and are either numbers or >= 3 characters long
            if w not in ALL_STOP_WORDS and (len(w) >= 3 or is_numeric) and w not in seen:
                concepts.append(w)
                seen.add(w)
                
        return concepts

    @staticmethod
    def validate_transcript_quality(
        raw_text: str, 
        cleaned_text: str
    ) -> Tuple[bool, str, float]:
        """
        Applies heuristics to check if the speech transcript is valid for semantic evaluation.
        
        Returns:
            is_valid (bool): True if the transcript is a valid attempt.
            remarks (str): Description of the validation decision.
            quality_score (float): Confidence score of the transcript (0.0 to 1.0).
        """
        raw_trimmed = raw_text.strip()
        if not raw_trimmed:
            return False, "Transcript is empty.", 0.0

        # Word counts
        words = raw_trimmed.split()
        cleaned_words = cleaned_text.split()

        # Rule 1: Minimum word count threshold (checked on meaningful words after cleaning)
        if len(cleaned_words) < 2:
            return False, "Response does not contain enough meaningful words (less than 2 words after cleaning).", 0.1

        # Rule 2: Non-alphanumeric check (e.g., ASR transcribed only symbols or breath markers)
        # Using regex to find Unicode letters/digits/marks
        alphanumeric_words = [w for w in words if regex.search(r"[\p{L}\p{N}\p{M}]", w)]
        if not alphanumeric_words:
            return False, "Response contains no meaningful alphabetic or numeric content.", 0.0

        # Rule 3: Word repetition check (ASR loops, stuttering, or student repeating single syllable)
        # Lexical diversity = unique words / total words
        unique_words = set(words)
        diversity = len(unique_words) / len(words)

        if len(words) >= 4 and diversity < 0.35:
            logger.warning(f"Low diversity ({diversity:.2f}) detected in: '{raw_trimmed}'")
            return False, "High degree of word repetition detected (potential ASR loop or stuttering).", 0.2

        # Rule 4: Single character repetition / Gibberish (e.g., "zzzzz", "aaaa bbbb")
        for w in words:
            if len(w) > 5 and len(set(w)) <= 2:
                logger.warning(f"Gibberish word detected: '{w}' in response: '{raw_trimmed}'")
                return False, f"Gibberish or repeating characters detected in word: '{w}'", 0.1

        # Heuristic quality score: combinations of lexical diversity and word length
        # A responses with 5+ words and good lexical diversity yields a higher score
        word_count_factor = min(1.0, len(cleaned_words) / 8.0)
        quality_score = (word_count_factor * 0.4) + (diversity * 0.6)
        quality_score = round(min(1.0, max(0.1, quality_score)), 2)

        return True, "Transcript quality verified.", quality_score
