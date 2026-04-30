import kleur from 'kleur'

export const log = {
  info: (msg: string) => console.log(kleur.cyan('[info] ') + msg),
  ok: (msg: string) => console.log(kleur.green('[ ok ] ') + msg),
  warn: (msg: string) => console.warn(kleur.yellow('[warn] ') + msg),
  error: (msg: string) => console.error(kleur.red('[ err] ') + msg),
  step: (msg: string) => console.log(kleur.magenta('\n>> ') + kleur.bold(msg))
}
