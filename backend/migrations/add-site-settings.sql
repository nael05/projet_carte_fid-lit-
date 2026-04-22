-- Migration : table site_settings pour stocker les paramètres administrables du site
-- Exécuter via POST /api/setup/run-migration ou mysql -u root -p db < ce_fichier.sql

CREATE TABLE IF NOT EXISTS `site_settings` (
  `setting_key`   VARCHAR(100) NOT NULL,
  `setting_value` LONGTEXT     DEFAULT NULL,
  `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valeur par défaut : Mentions Légales complètes (balises HTML, remplacer les [VARIABLES])
INSERT INTO `site_settings` (`setting_key`, `setting_value`)
VALUES (
  'mentions_legales',
  '<h1>Mentions L&eacute;gales</h1>

<h2>1. &Eacute;diteur du site</h2>
<p>Le pr&eacute;sent site et la plateforme <strong>Fidelyz</strong> sont &eacute;dit&eacute;s par la soci&eacute;t&eacute; <strong>[NOM_ENTREPRISE]</strong>, <strong>[FORME_JURIDIQUE]</strong> au capital de <strong>[CAPITAL] &euro;</strong>, immatricul&eacute;e au Registre du Commerce et des Soci&eacute;t&eacute;s de <strong>[VILLE_RCS]</strong> sous le num&eacute;ro SIRET <strong>[SIRET]</strong>.</p>
<p><strong>Si&egrave;ge social :</strong> [ADRESSE_COMPLETE]<br/>
<strong>T&eacute;l&eacute;phone :</strong> [TELEPHONE]<br/>
<strong>Email :</strong> [EMAIL_CONTACT]<br/>
<strong>Directeur de la publication :</strong> [NOM_DIRECTEUR]</p>

<h2>2. H&eacute;bergement</h2>
<p>La plateforme Fidelyz est h&eacute;berg&eacute;e par :</p>
<p><strong>[NOM_HEBERGEUR]</strong><br/>
[ADRESSE_HEBERGEUR]<br/>
Site web : <strong>[URL_HEBERGEUR]</strong></p>

<h2>3. Propri&eacute;t&eacute; intellectuelle</h2>
<p>L&apos;ensemble du contenu de cette plateforme (textes, images, graphismes, logo, ic&ocirc;nes, algorithmes, code source&hellip;) est la propri&eacute;t&eacute; exclusive de <strong>[NOM_ENTREPRISE]</strong> ou de ses partenaires et est prot&eacute;g&eacute; par les lois fran&ccedil;aises et internationales relatives &agrave; la propri&eacute;t&eacute; intellectuelle (Code de la Propri&eacute;t&eacute; Intellectuelle, loi n&deg; 92-597 du 1er juillet 1992).</p>
<p>Toute reproduction, repr&eacute;sentation, modification, publication, adaptation ou transmission de tout ou partie de la plateforme, par quelque proc&eacute;d&eacute; que ce soit, est strictement interdite sans l&apos;autorisation &eacute;crite pr&eacute;alable de <strong>[NOM_ENTREPRISE]</strong>.</p>

<h2>4. Description du service</h2>
<p><strong>Fidelyz</strong> est une plateforme SaaS B2B destin&eacute;e aux commercants qui souhaitent cr&eacute;er, personnaliser et distribuer des cartes de fid&eacute;lit&eacute; d&eacute;mat&eacute;rialis&eacute;es compatibles <strong>Apple Wallet</strong> et <strong>Google Wallet</strong>. Elle permet la gestion des points de fid&eacute;lit&eacute;, le suivi des clients et l&apos;envoi de notifications push.</p>
<p>Le service est accessible aux entreprises (ci-apr&egrave;s &laquo;&nbsp;Partenaires Commercants&nbsp;&raquo;) dans le cadre d&apos;un abonnement SaaS, ainsi qu&apos;aux clients finaux de ces commercants.</p>

<h2>5. Collecte et traitement des donn&eacute;es personnelles</h2>
<p>Conform&eacute;ment au R&egrave;glement G&eacute;n&eacute;ral sur la Protection des Donn&eacute;es (<strong>RGPD &mdash; R&egrave;glement UE 2016/679</strong>) et &agrave; la loi Informatique et Libert&eacute;s du 6 janvier 1978 modifi&eacute;e, <strong>[NOM_ENTREPRISE]</strong> s&apos;engage &agrave; prot&eacute;ger les donn&eacute;es personnelles collect&eacute;es via la plateforme.</p>

<h3>5.1 Donn&eacute;es collect&eacute;es</h3>
<p>Dans le cadre du service, les cat&eacute;gories de donn&eacute;es suivantes peuvent &ecirc;tre collect&eacute;es :</p>
<ul>
  <li><strong>Donn&eacute;es d&apos;identification :</strong> pr&eacute;nom, nom, adresse e-mail, num&eacute;ro de t&eacute;l&eacute;phone</li>
  <li><strong>Donn&eacute;es de fid&eacute;lit&eacute; :</strong> historique des points, tampons, r&eacute;compenses obtenues</li>
  <li><strong>Donn&eacute;es techniques :</strong> num&eacute;ro de s&eacute;rie du pass num&eacute;rique, identifiant d&apos;appareil (pour Apple/Google Wallet), adresse IP de connexion</li>
</ul>

<h3>5.2 Finalit&eacute;s du traitement</h3>
<ul>
  <li>Ex&eacute;cution du contrat de service de carte de fid&eacute;lit&eacute; d&eacute;mat&eacute;rialis&eacute;e</li>
  <li>Gestion des comptes commercants et clients</li>
  <li>Envoi de notifications push li&eacute;es aux mises &agrave; jour du solde de points (int&eacute;gration Apple Push Notification Service &amp; Google Wallet API)</li>
  <li>Envoi de communications promotionnelles, <strong>uniquement avec consentement pr&eacute;alable et explicite du client final</strong></li>
  <li>Am&eacute;lioration du service et d&eacute;tection des fraudes</li>
</ul>

<h3>5.3 Base l&eacute;gale</h3>
<ul>
  <li><strong>Ex&eacute;cution du contrat</strong> (Art. 6(1)(b) RGPD) : pour les donn&eacute;es n&eacute;cessaires &agrave; la fourniture du service</li>
  <li><strong>Consentement</strong> (Art. 6(1)(a) RGPD) : pour les communications marketing optionnelles</li>
  <li><strong>Int&eacute;r&ecirc;t l&eacute;gitime</strong> (Art. 6(1)(f) RGPD) : pour la s&eacute;curit&eacute; du service et la lutte contre la fraude</li>
</ul>

<h3>5.4 Dur&eacute;e de conservation</h3>
<p>Les donn&eacute;es personnelles sont conserv&eacute;es pendant toute la dur&eacute;e de la relation commerciale, puis pendant une p&eacute;riode de <strong>3 ans</strong> &agrave; compter de la fin de ladite relation, sauf obligation l&eacute;gale contraire (ex. : donn&eacute;es comptables conserv&eacute;es 10 ans).</p>

<h3>5.5 Responsable du traitement</h3>
<p>Pour les donn&eacute;es des Partenaires Commercants : <strong>[NOM_ENTREPRISE]</strong> agit en tant que responsable du traitement.<br/>
Pour les donn&eacute;es des clients finaux des commercants : le commercant est responsable du traitement ; <strong>[NOM_ENTREPRISE]</strong> agit en qualit&eacute; de sous-traitant au sens de l&apos;Article 28 du RGPD.</p>
<p>Contact DPO / Responsable RGPD : <strong>[EMAIL_DPO]</strong></p>

<h2>6. Droits des personnes concern&eacute;es</h2>
<p>Conform&eacute;ment au RGPD, toute personne dont les donn&eacute;es sont trait&eacute;es par la plateforme dispose des droits suivants :</p>
<ul>
  <li><strong>Droit d&apos;acc&egrave;s</strong> (Art. 15) : obtenir la confirmation que vos donn&eacute;es sont trait&eacute;es et en obtenir une copie</li>
  <li><strong>Droit de rectification</strong> (Art. 16) : corriger des donn&eacute;es inexactes ou incompl&egrave;tes</li>
  <li><strong>Droit &agrave; l&apos;effacement</strong> (Art. 17) : demander la suppression de vos donn&eacute;es</li>
  <li><strong>Droit &agrave; la limitation du traitement</strong> (Art. 18) : suspendre temporairement le traitement</li>
  <li><strong>Droit &agrave; la portabilit&eacute;</strong> (Art. 20) : recevoir vos donn&eacute;es dans un format structur&eacute;</li>
  <li><strong>Droit d&apos;opposition</strong> (Art. 21) : vous opposer au traitement, notamment &agrave; des fins de prospection</li>
  <li><strong>Droit de retrait du consentement</strong> : &agrave; tout moment, pour les traitements bas&eacute;s sur le consentement</li>
</ul>
<p>Pour exercer ces droits, adressez votre demande &agrave; : <strong>[EMAIL_DPO]</strong><br/>
En cas de r&eacute;ponse insatisfaisante, vous disposez du droit de saisir la <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libert&eacute;s) &mdash; <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>

<h2>7. Cookies et traceurs</h2>
<p>La plateforme Fidelyz utilise des cookies <strong>strictement n&eacute;cessaires</strong> &agrave; son fonctionnement :</p>
<ul>
  <li><strong>Cookie d&apos;authentification :</strong> token JWT stock&eacute; en localStorage pour maintenir la session utilisateur</li>
  <li><strong>Cookie de pr&eacute;f&eacute;rence :</strong> th&egrave;me d&apos;affichage (clair/sombre)</li>
  <li><strong>Identifiant d&apos;appareil :</strong> fingerprint technique pour la gestion multi-appareils</li>
</ul>
<p><strong>Aucun cookie publicitaire ou de pistage tiers</strong> n&apos;est utilis&eacute; sur cette plateforme. Vous pouvez configurer votre navigateur pour refuser les cookies ; certaines fonctionnalit&eacute;s pourraient alors &ecirc;tre inaccessibles.</p>

<h2>8. S&eacute;curit&eacute; des donn&eacute;es</h2>
<p><strong>[NOM_ENTREPRISE]</strong> met en &oelig;uvre des mesures techniques et organisationnelles adapt&eacute;es pour assurer la s&eacute;curit&eacute; des donn&eacute;es, notamment :</p>
<ul>
  <li>Chiffrement des mots de passe (algorithme bcrypt)</li>
  <li>Authentification par tokens JWT sign&eacute;s (expiration 7 jours)</li>
  <li>Communications chiffr&eacute;es en HTTPS/TLS</li>
  <li>Cloisonnement multi-tenant : les donn&eacute;es de chaque commercant sont isol&eacute;es</li>
  <li>Limitation du nombre de requ&ecirc;tes (rate limiting) pour pr&eacute;venir les attaques par force brute</li>
  <li>Journalisation des acc&egrave;s et des actions sensibles</li>
</ul>

<h2>9. Transferts de donn&eacute;es hors UE</h2>
<p>Dans le cadre de l&apos;utilisation des services Apple Push Notification Service (APNs) et Google Wallet API, certaines donn&eacute;es techniques (identifiants d&apos;appareils, tokens de notification) peuvent &ecirc;tre transmises &agrave; des serveurs situ&eacute;s hors de l&apos;Union Europ&eacute;enne. Ces transferts sont encadr&eacute;s par des clauses contractuelles types approuv&eacute;es par la Commission Europ&eacute;enne.</p>

<h2>10. Liens hypertextes</h2>
<p>La plateforme peut contenir des liens vers des sites tiers (Apple, Google, etc.). <strong>[NOM_ENTREPRISE]</strong> n&apos;exerce aucun contr&ocirc;le sur ces sites et d&eacute;cline toute responsabilit&eacute; quant &agrave; leur contenu ou leur politique de confidentialit&eacute;.</p>

<h2>11. Limitation de responsabilit&eacute;</h2>
<p><strong>[NOM_ENTREPRISE]</strong> ne saurait &ecirc;tre tenu responsable des dommages directs ou indirects r&eacute;sultant de l&apos;utilisation ou de l&apos;impossibilit&eacute; d&apos;utiliser la plateforme, d&apos;une interruption de service, d&apos;une perte de donn&eacute;es ou d&apos;une intrusion informatique malveillante, dans les limites autoris&eacute;es par la l&eacute;gislation applicable.</p>

<h2>12. Droit applicable et juridiction comp&eacute;tente</h2>
<p>Les pr&eacute;sentes mentions l&eacute;gales sont r&eacute;gies par le <strong>droit fran&ccedil;ais</strong>. En cas de litige relatif &agrave; l&apos;interpr&eacute;tation ou &agrave; l&apos;ex&eacute;cution des pr&eacute;sentes et &agrave; d&eacute;faut de r&eacute;solution amiable, les <strong>tribunaux comp&eacute;tents du ressort du si&egrave;ge social de [NOM_ENTREPRISE]</strong> seront seuls comp&eacute;tents.</p>

<p><em>Derni&egrave;re mise &agrave; jour : [DATE_MISE_A_JOUR] &mdash; Ces mentions l&eacute;gales peuvent &ecirc;tre modifi&eacute;es &agrave; tout moment ; la version en vigueur est celle publi&eacute;e sur ce site.</em></p>'
)
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
