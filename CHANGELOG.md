## [8.4.0](https://github.com/joutio/joutio-client/compare/v8.3.0...v8.4.0) (2026-11-19)

### Features

* **question:** image description and game badges in the client contract ([fe0a16b](https://github.com/joutio/joutio-client/commit/fe0a16bb73a3402d4bd5ba05b376a52319878468))

## [8.3.0](https://github.com/joutio/joutio-client/compare/v8.2.2...v8.3.0) (2026-11-19)

### Features

* **api-types:** autoTrainOnTimeout is always present in MeView ([3d34717](https://github.com/joutio/joutio-client/commit/3d34717a3a4c0cd63b459e6b84f6bec227d95a84))

## [8.2.2](https://github.com/joutio/joutio-client/compare/v8.2.1...v8.2.2) (2026-11-17)

### Bug Fixes

* **i18n:** training notice states no Elo gain, drop result.trainingElo ([305715a](https://github.com/joutio/joutio-client/commit/305715ae17be9954692b35e771584f6f66d8934a))

## [8.2.1](https://github.com/joutio/joutio-client/compare/v8.2.0...v8.2.1) (2026-11-17)

### Bug Fixes

* **query:** topic leaderboard read sends the sheet's period, scope and size ([5926ac7](https://github.com/joutio/joutio-client/commit/5926ac7e56c68b8b758727872c460bc7f1de3878))

## [8.2.0](https://github.com/joutio/joutio-client/compare/v8.1.1...v8.2.0) (2026-11-17)

### Features

* **query:** HttpClient interface and shared BFF read factories ([8a2b036](https://github.com/joutio/joutio-client/commit/8a2b036fd329adb1c3c3517d3fddb084a119218e))

## [8.1.1](https://github.com/joutio/joutio-client/compare/v8.1.0...v8.1.1) (2026-11-17)

### Bug Fixes

* **build:** default export condition on every entry point ([47a73d7](https://github.com/joutio/joutio-client/commit/47a73d7d7460411f1167f2325e4d4123bdff2ac5))

## [8.1.0](https://github.com/joutio/joutio-client/compare/v8.0.0...v8.1.0) (2026-11-17)

### Features

* **query:** shared query keys, optimistic transaction and contacts cache update ([ea8941e](https://github.com/joutio/joutio-client/commit/ea8941e2088ba26337bb9463c892bb5de094446a))

## [8.0.0](https://github.com/joutio/joutio-client/compare/v7.0.1...v8.0.0) (2026-11-17)

### ⚠ BREAKING CHANGES

* **forms:** questionDraftSchema(imageChanged) becomes questionDraftSchema(savedImageUrl?).

### Features

* **forms:** questionDraftSchema takes the saved image URL ([62334e0](https://github.com/joutio/joutio-client/commit/62334e0131421d937f9e385b06c386d3d355d205))

## [7.0.1](https://github.com/joutio/joutio-client/compare/v7.0.0...v7.0.1) (2026-11-17)

### Bug Fixes

* **forms:** content notice category typed, good faith as a boolean ([256c53f](https://github.com/joutio/joutio-client/commit/256c53fabb4a605f856969bd47cfd2791a6932fe))

## [7.0.0](https://github.com/joutio/joutio-client/compare/v6.2.0...v7.0.0) (2026-11-17)

### ⚠ BREAKING CHANGES

* **forms:** mobile.auth.invalidEmail is renamed form.invalidEmail.

### Features

* **forms:** shared Zod form schemas and input limits ([160b718](https://github.com/joutio/joutio-client/commit/160b71893fd10012605a4f643837592eda7cecca))

## [6.2.0](https://github.com/joutio/joutio-client/compare/v6.1.0...v6.2.0) (2026-11-17)

### Features

* **i18n:** avatar editor dictionary in French and English ([baf952f](https://github.com/joutio/joutio-client/commit/baf952fc5630ddbfe335593f230434104c914195))

## [6.1.0](https://github.com/joutio/joutio-client/compare/v6.0.0...v6.1.0) (2026-11-17)

### Features

* **i18n:** mastery, round review and slide accessibility labels ([ffbc2dd](https://github.com/joutio/joutio-client/commit/ffbc2dd089c1a0776a3d0319bed772db092fbfac))

## [6.0.0](https://github.com/joutio/joutio-client/compare/v5.1.0...v6.0.0) (2026-11-17)

### ⚠ BREAKING CHANGES

* **i18n:** mobile.ds.* keys renamed to ds.*, mobile.profile.locked to common.locked.

### Features

* **i18n:** design system labels under ds.*, web frame and store texts ([aeee372](https://github.com/joutio/joutio-client/commit/aeee37270e322dc8a4b95c5625a23a2cc015213a))

## [5.1.0](https://github.com/joutio/joutio-client/compare/v5.0.0...v5.1.0) (2026-11-16)

### Features

* **i18n:** keyboard toolbar done label ([8c5b776](https://github.com/joutio/joutio-client/commit/8c5b7767b0343e5288018c5064397532997aefb3))

## [5.0.0](https://github.com/joutio/joutio-client/compare/v4.1.0...v5.0.0) (2026-11-16)

### ⚠ BREAKING CHANGES

* provisional is removed from progression, leaderboard, player card, room opponent and game result views; result.unranked, profile.unranked, profile.provisional, topic.provisional, mobile.ds.provisional and mobile.profile.rankAfter keys are removed.

### Features

* rooms waiting for the viewer, room presence, topic name check ([d9cd724](https://github.com/joutio/joutio-client/commit/d9cd7249da88be715a9fbd18b01357d27f45b13f))

## [4.1.0](https://github.com/joutio/joutio-client/compare/v4.0.0...v4.1.0) (2026-11-15)

### Features

* **profile:** dated titles and badges, latest titles label ([8b79016](https://github.com/joutio/joutio-client/commit/8b790163e4ca715de526fa45e14bcb851245a7e5))

## [4.0.0](https://github.com/joutio/joutio-client/compare/v3.0.0...v4.0.0) (2026-11-15)

### ⚠ BREAKING CHANGES

* **i18n:** the package name changes from @joutio/client-domain to @joutio/client.

### Features

* **api-types:** official topics, content notices and terms acceptance ([09f76e1](https://github.com/joutio/joutio-client/commit/09f76e18476f485db15047e9a08af67613b9ccb3))
* **i18n:** rename the package to @joutio/client and share the FR/EN texts ([ab487a1](https://github.com/joutio/joutio-client/commit/ab487a18afea95b4d66b05129a465ac570b756f7))

## [3.0.0](https://github.com/joutio/joutio-client-domain/compare/v2.9.0...v3.0.0) (2026-11-14)

### ⚠ BREAKING CHANGES

* **share:** remove referral codes, invite links and the Recruiter tiers

### Features

* **share:** remove referral codes, invite links and the Recruiter tiers ([8ec21d8](https://github.com/joutio/joutio-client-domain/commit/8ec21d8424f961661d7c9323a6fdfb4fb349352e))

## [2.9.0](https://github.com/joutio/joutio-client-domain/compare/v2.8.0...v2.9.0) (2026-11-13)

### Features

* localized topic description and streak day unlock ([2be097f](https://github.com/joutio/joutio-client-domain/commit/2be097f9fd7471af8efa3245b8f59463f94b7cfb))

## [2.8.0](https://github.com/joutio/joutio-client-domain/compare/v2.7.0...v2.8.0) (2026-11-13)

### Features

* **authoring:** topic titles per mastery tier ([3689f61](https://github.com/joutio/joutio-client-domain/commit/3689f61427bf547f597126c094df45301dc46302))

## [2.7.0](https://github.com/joutio/joutio-client-domain/compare/v2.6.1...v2.7.0) (2026-11-13)

### Features

* **api-types:** Recruiter badge family ([da3ae34](https://github.com/joutio/joutio-client-domain/commit/da3ae34b484f638912fcbf12369ac59a276bd5b8))

## [2.6.1](https://github.com/joutio/joutio-client-domain/compare/v2.6.0...v2.6.1) (2026-11-13)

### Bug Fixes

* **share:** Recruiter badge has the seven common tiers ([3c4cd18](https://github.com/joutio/joutio-client-domain/commit/3c4cd182dff3c35477678c4d9d0d5c00ca594faa))

## [2.6.0](https://github.com/joutio/joutio-client-domain/compare/v2.5.0...v2.6.0) (2026-11-13)

### Features

* ISO countries, universal share links and birth date rules ([f3ba139](https://github.com/joutio/joutio-client-domain/commit/f3ba13930f2b1ea923614d8d794735e56899b84d))

## [2.5.0](https://github.com/joutio/joutio-client-domain/compare/v2.4.0...v2.5.0) (2026-11-12)

### Features

* **authoring:** count playable questions of a topic ([8782f13](https://github.com/joutio/joutio-client-domain/commit/8782f13a5c4ac2ec208d9dd6d2c056bf1b92ce36))

## [2.4.0](https://github.com/joutio/joutio-client-domain/compare/v2.3.0...v2.4.0) (2026-11-12)

### Features

* **rooms:** keep the failure reason of a failed room ([849952b](https://github.com/joutio/joutio-client-domain/commit/849952b98fa0ebcd5e8ed967e505f36bb712b32b))

## [2.3.0](https://github.com/joutio/joutio-client-domain/compare/v2.2.0...v2.3.0) (2026-11-12)

### Features

* **premium:** plan limits, frozen topics and quota problems ([dd05712](https://github.com/joutio/joutio-client-domain/commit/dd0571272a8042881bb1eb1a51ac3f8721e9c531))

## [2.2.0](https://github.com/joutio/joutio-client-domain/compare/v2.1.0...v2.2.0) (2026-11-12)

### Features

* **profile:** pseudonym rules and availability contract ([66b5591](https://github.com/joutio/joutio-client-domain/commit/66b55912c70c077c2941a7f10cc63c6146c49f0f))

## [2.1.0](https://github.com/joutio/joutio-client-domain/compare/v2.0.0...v2.1.0) (2026-11-12)

### Features

* **api-types:** Premium entitlement and plan limits on MeView ([9f74b41](https://github.com/joutio/joutio-client-domain/commit/9f74b41e345176d1885d5ac9a4bc38e278afaee9))

## [2.0.0](https://github.com/joutio/joutio-client-domain/compare/v1.0.1...v2.0.0) (2026-11-12)

### ⚠ BREAKING CHANGES

* TopicStatView and SuggestionView drop emoji and color.
TopicCardView, TopicRefView, TopicStatView and SuggestionView gain
pictogramUrl; TopicStatView gains category.

### Features

* topic pictogram in topic views, emoji and color removed ([f5ac26a](https://github.com/joutio/joutio-client-domain/commit/f5ac26aa954ba4bd257c7f7b5d4a59c6aac1259a))

## [1.0.1](https://github.com/joutio/joutio-client-domain/compare/v1.0.0...v1.0.1) (2026-11-11)

### Bug Fixes

* question reading time is 2 s, aligned with the game service ([0c64ae2](https://github.com/joutio/joutio-client-domain/commit/0c64ae2cc5da0380c3a47d138d7bb9031aa111de))

## 1.0.0 (2026-11-11)

### Features

* shared client domain extracted from joutio-mobile ([7e47f0b](https://github.com/joutio/joutio-client-domain/commit/7e47f0bcc312a63c9eac089ad62fe1abd094ccf7))
