# Reconnaissance photo

- `mobileclip_s0.onnx` : encodeur d'image de MobileCLIP S0 (Apple, https://github.com/apple/ml-mobileclip, licence Apple Sample Code / « other »),
  version ONNX de Xenova/mobileclip_s0 (Hugging Face). Poids stockés en float16 pour diviser la taille par deux ; les calculs restent en float32.
- `libelles.json` : descriptions précalculées (catégories et noms, matières, couleurs), produites avec l'encodeur de texte du même modèle.
  Pour ajouter un nom ou une catégorie, il faut recalculer ce fichier.
- Le moteur `vendor/ort.wasm.min.js` est onnxruntime-web 1.20.1 (Microsoft, licence MIT).

Tout tourne dans le navigateur du téléphone : aucune photo n'est envoyée sur internet.
