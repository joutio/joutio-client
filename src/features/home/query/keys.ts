import { typed } from '../../../core/query/keys.js'
import type { HomeView } from '../types.js'

export const homeKeys = {
  view: () => typed<HomeView>()(['home']),
}
