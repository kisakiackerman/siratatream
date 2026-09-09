# Instructions et Règles de l'Agent

- L'agent ne doit **JAMAIS** remplir, pré-remplir ou suggérer des valeurs pour les champs tels que "appareil connecté", "suggestions de vidéos" ou toute autre case de ce type (habituellement générées ou pré-remplies par l'IA).
- Ces champs sont strictement réservés à la saisie manuelle de l'utilisateur.
- Dans le code généré, les structures de données, ou les interfaces, ces champs doivent systématiquement rester vides, `null`, ou non définis. Aucune donnée fictive (mock data) ne doit y être injectée.
