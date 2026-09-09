import { useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";

type LegalModalProps = {
  type: "privacy" | "terms";
  onClose: () => void;
};

export default function LegalModal({ type, onClose }: LegalModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] bg-zinc-900 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl mt-16 sm:mt-0 border border-zinc-800"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-white font-bold text-lg flex-1">
            {type === "privacy" ? "Politique de confidentialité" : "Conditions d'utilisation"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 text-zinc-300 text-sm leading-relaxed space-y-5">
          {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>
      </motion.div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-zinc-500 text-xs">Dernière mise à jour : 18 août 2026</p>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">1. Qui sommes-nous</h3>
        <p>
          SiratStream est une plateforme de contenus islamiques (récits des prophètes, histoires
          des compagnons, et autres contenus éducatifs) exploitée par Oummah SiratStream, une communauté
          indépendante à but non lucratif. Pour toute question relative à vos données
          personnelles, vous pouvez nous contacter à l'adresse :{" "}
          <a href="mailto:zelephackerman3@gmail.com" className="text-emerald-400 hover:underline">
            zelephackerman3@gmail.com
          </a>.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">2. Données que nous collectons</h3>
        <p className="mb-2">Lorsque vous utilisez SiratStream, nous collectons :</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Votre adresse email et votre nom, via la connexion Google (Google OAuth)</li>
          <li>Les profils spectateurs que vous créez (nom, couleur d'avatar, profil enfant ou non)</li>
          <li>Votre liste de favoris (« Ma Liste »)</li>
          <li>Votre historique de visionnage et la progression de lecture des vidéos</li>
        </ul>
        <p className="mt-2">
          Nous ne collectons aucune donnée bancaire, aucune donnée de localisation précise, et
          nous n'utilisons aucun cookie publicitaire ou traceur tiers à des fins commerciales.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">3. Pourquoi nous collectons ces données</h3>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Vous permettre de vous connecter et de retrouver votre compte</li>
          <li>Vous permettre de créer jusqu'à 4 profils spectateurs distincts</li>
          <li>Sauvegarder votre liste de favoris et votre historique de visionnage</li>
          <li>Améliorer le fonctionnement général de l'application</li>
        </ul>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">4. Où sont stockées vos données</h3>
        <p>
          Vos données sont hébergées et sécurisées par Supabase, un fournisseur d'infrastructure
          cloud tiers. L'accès à vos données personnelles est protégé par des règles de sécurité
          strictes (Row Level Security) garantissant que seul votre compte peut consulter ou
          modifier vos propres informations.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">5. Partage des données</h3>
        <p>
          Nous ne vendons, ne louons et ne partageons vos données personnelles avec aucun tiers à
          des fins commerciales ou publicitaires. Les vidéos affichées sur SiratStream sont hébergées
          sur YouTube et lues via le lecteur intégré YouTube.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">6. Vos droits</h3>
        <p className="mb-2">Vous pouvez à tout moment :</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Accéder aux données que nous détenons sur vous</li>
          <li>Demander la suppression de votre compte et de l'ensemble de vos données associées</li>
          <li>Supprimer individuellement un profil spectateur, vos favoris ou votre historique depuis l'application</li>
        </ul>
      </section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-zinc-500 text-xs">Dernière mise à jour : 18 août 2026</p>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">1. Objet</h3>
        <p>
          SiratStream est une application proposant un catalogue de contenus vidéo à vocation
          éducative et religieuse islamique : récits des prophètes, histoires des compagnons,
          contenus sur l'eschatologie, les miracles du Coran et d'autres histoires islamiques. L'application
          est exploitée par la communauté Oummah SiratStream, à but non lucratif.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">2. Accès au service</h3>
        <p>
          L'accès à SiratStream nécessite la création d'un compte via connexion Google. Chaque
          compte peut créer jusqu'à 4 profils spectateurs distincts. L'utilisation du service est
          gratuite.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">3. Contenu et propriété intellectuelle</h3>
        <p>
          Les vidéos proposées sur SiratStream proviennent de créateurs de contenu tiers (notamment
          NARRO, Yacine, Towards Eternity et Croyant Rationnel) et restent hébergées sur YouTube. SiratStream ne
          revendique aucune propriété sur ces contenus et se contente de les organiser et de les
          présenter au sein d'un catalogue thématique. Tous droits réservés à leurs auteurs
          respectifs.
        </p>
      </section>

      <section>
        <h3 className="text-white font-semibold text-base mb-2">4. Comportement attendu des utilisateurs</h3>
        <p className="mb-2">En utilisant SiratStream, vous vous engagez à :</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Ne pas tenter de contourner les mesures de sécurité de l'application</li>
          <li>Ne pas utiliser le service à des fins illégales ou contraires à son objet</li>
          <li>Ne pas usurper l'identité d'un tiers lors de la création d'un compte ou d'un profil</li>
        </ul>
      </section>
    </>
  );
}
