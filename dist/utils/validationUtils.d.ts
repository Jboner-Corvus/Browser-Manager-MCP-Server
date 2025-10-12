/**
 * Valide si une chaîne de caractères est une URL HTTP/HTTPS valide.
 * @param urlString La chaîne à valider.
 * @param context Un contexte optionnel pour la journalisation (ex: nom de la fonction appelante).
 * @returns `true` si l'URL est valide, `false` sinon.
 */
export declare function isValidHttpUrl(urlString: string | undefined | null, context?: string): boolean;
