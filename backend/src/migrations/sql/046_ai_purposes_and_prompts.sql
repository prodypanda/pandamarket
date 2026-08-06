-- 046_ai_purposes_and_prompts.sql
-- Multi-Engine AI Purpose Routing and Prompt Templates

CREATE TABLE IF NOT EXISTS pd_ai_purpose_routing (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL UNIQUE, -- 'text_summarization', 'content_generation', 'image_studio'
  provider_config_id TEXT REFERENCES pd_ai_provider_config(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_ai_prompt_templates (
  prompt_key TEXT PRIMARY KEY, -- 'product_smart_fill', 'photo_studio_background', 'photo_studio_gallery', 'photo_studio_upscale', 'page_copy'
  title TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  default_prompt TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default prompt templates
INSERT INTO pd_ai_prompt_templates (prompt_key, title, description, system_prompt, default_prompt)
VALUES 
(
  'product_smart_fill',
  'Générateur Intelligent de Fiche Produit',
  'Génère automatiquement le titre commercial, la description HTML détaillée, la catégorie/sous-catégorie Hub et la catégorie/sous-catégorie Boutique.',
  'Vous êtes un expert e-commerce mondial spécialisé dans le merchandising produit. À partir des informations fournies (nom, brouillon de texte ou image), vous devez générer une fiche produit vendeuse et structurée.',
  'Vous devez retourner EXCLUSIVEMENT un objet JSON valide avec les clés suivantes :
{
  "suggested_title": "Titre produit captivant (max 100 caractères)",
  "suggested_description": "Description HTML complète (max 2000 caractères, utilise uniquement les balises <p>, <strong>, <ul>, <li>, <h3>)",
  "suggested_hub_category_name": "Nom de la catégorie principale du Hub",
  "suggested_hub_subcategory_name": "Nom de la sous-catégorie du Hub",
  "suggested_storefront_category": "Nom de la catégorie de la boutique du vendeur",
  "suggested_storefront_subcategory": "Nom de la sous-catégorie de la boutique"
}

Données du produit d''entrée :
Titre / Mots clés : {title}
Description brute : {description}
Langue ciblée : {language}'
),
(
  'photo_studio_background',
  'Studio Photo & Remplacement de Fond',
  'Détoure automatiquement le produit et l''intègre dans un décor studio haut de gamme.',
  'Vous êtes un photographe studio produit professionnel spécialisé dans l''éclairage e-commerce et le rendu haute définition.',
  'Créez un rendu professionnel pour le produit en remplaçant le fond par le style suivant : {preset_description}. Le produit doit être parfaitement détouré, avec des ombres naturelles et un éclairage doux et homogène.'
),
(
  'photo_studio_gallery',
  'Générateur de Mockups & Galerie Produit',
  'Génère 2 images additionnelles de mise en situation ou de déclinaison lifestyle pour la galerie produit.',
  'Vous êtes un directeur artistique e-commerce créant des photos lifestyle et mockups en situation réelle d''utilisation.',
  'Générez une photo de galerie professionnelle et élégante pour le produit "{title}". Style : {style_description}. Qualité ultra-nette 4K, cadrage équilibré.'
),
(
  'photo_studio_upscale',
  'Sublimateur d''Éclairage & Haute Définition',
  'Améliore la netteté, ajuste la balance des blancs et réhausse la lumière globale du produit.',
  'Vous êtes un retoucheur photo professionnel e-commerce.',
  'Sublimez cette photo produit : améliorez la netteté, équilibrez les ombres, dynamisez les couleurs et réhaussez la lumière globale tout en conservant l''aspect 100% réel du produit.'
),
(
  'page_copy',
  'Générateur de Rédaction de Page Landing',
  'Rédige des accroches et titres pour les pages de boutique.',
  'Vous êtes un concepteur-rédacteur e-commerce.',
  'Générer du texte court et percutant pour la page {page_title}.'
)
ON CONFLICT (prompt_key) DO NOTHING;
