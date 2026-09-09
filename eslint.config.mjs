import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['dist/**', 'artifacts/**', 'scripts/**', 'tests/**', '.*-vault/**', '.*-profile/**'] },
  ...obsidianmd.configs.recommended,
  { languageOptions: { parserOptions: { projectService: { allowDefaultProject: ['eslint.config.*'] } } } },
  { rules: { 'obsidianmd/ui/sentence-case': ['warn', { brands: ['Superpowers', 'OpenAI', 'Anthropic', 'Google Gemini'] }] } },
]);
