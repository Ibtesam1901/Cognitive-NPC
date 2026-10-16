import unittest
import json
from app import app

class TestFlaskEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')

    def test_npc(self):
        res = self.client.get('/api/npc')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))
        self.assertEqual(data['npc']['name'], "Raghu the Elder")

    def test_hint_en(self):
        res = self.client.post('/api/npc/hint', json={"language": "en"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))
        self.assertTrue(len(data.get('hint', '')) > 0)

    def test_hint_kn(self):
        res = self.client.post('/api/npc/hint', json={"language": "kn"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))
        self.assertTrue(len(data.get('hint', '')) > 0)

    def test_hint_hi(self):
        res = self.client.post('/api/npc/hint', json={"language": "hi"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))
        self.assertTrue(len(data.get('hint', '')) > 0)

    def test_translate(self):
        res = self.client.post('/api/npc/translate', json={
            "text": "Water the crops before noon.",
            "target_language": "hi"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))

    def test_quest(self):
        res = self.client.post('/api/npc/quest', json={"language": "en", "context": {}})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('ok'))
        self.assertIn('quest', data)

    def test_chat_structure(self):
        payload = {
            "message": "Namaste Raghu-ji, how are you today?",
            "language": "en",
            "context": {
                "time": 8,
                "weather": "clear",
                "plots": [{"id": 1, "crop": None, "locked": False}],
                "inventory": {"seeds": 3}
            }
        }
        res = self.client.post('/api/npc/chat', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        for key in [
            "npc_name", "reply", "language", "emotion", "animation",
            "quest", "actions", "inventory_changes", "dialogue_choices",
            "suggested_follow_up", "voice_text", "conversation_summary",
            "needs_clarification"
        ]:
            self.assertIn(key, data, f"Missing key: {key}")

    def test_chat_with_text_field(self):
        # Verify that frontend requests using 'text' instead of 'message' succeed with 200
        payload = {
            "text": "Raghu, tell me about the village harvest.",
            "lang": "en"
        }
        res = self.client.post('/api/npc/chat', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("npc_name"), "Raghu the Elder")
        self.assertIn("reply", data)

    def test_chat_multilingual_kn(self):
        payload = {
            "message": "ನಮಸ್ಕಾರ ರಘು, ಭೂಮಿಯ ಬಗ್ಗೆ ಹೇಳಿ",
            "language": "kn"
        }
        res = self.client.post('/api/npc/chat', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("language"), "kn")

    def test_chat_multilingual_hi(self):
        payload = {
            "text": "नमस्ते रघु जी",
            "language": "hi"
        }
        res = self.client.post('/api/npc/chat', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("language"), "hi")

    def test_chat_empty_400(self):
        # Empty message should return 400 with descriptive error JSON
        res = self.client.post('/api/npc/chat', json={"message": "   "})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("error", data)
        self.assertEqual(data.get("code"), "MISSING_MESSAGE_FIELD")
        self.assertIn("expected_fields", data)

if __name__ == '__main__':
    unittest.main()
