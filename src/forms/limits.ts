/** Code à usage unique reçu par e-mail (connexion, suppression du compte) : chiffres, longueur fixe. */
export const OTP_LENGTH = 6
/** Délai avant de pouvoir redemander un code. */
export const OTP_RESEND_SECONDS = 60
/** Bio du profil (miroir de `joutio-profile`). */
export const MAX_BIO = 160
/** Commentaire d'un signalement de joueur ou de question (miroir du BFF, `*ReportRules.MAX_COMMENT_LENGTH`). */
export const MAX_REPORT_COMMENT = 500
/** Description d'un signalement de contenu illicite (miroir du BFF, `ContentNoticeRequest`). */
export const MAX_NOTICE_DESCRIPTION = 4000
