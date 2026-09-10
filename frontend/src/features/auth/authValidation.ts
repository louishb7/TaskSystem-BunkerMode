export function validateAuth(payload, register = false) {
  const identifier = typeof payload.email === "string" ? payload.email.trim() : ""
  const password = payload.senha
  if (!identifier || identifier.length > 254)
    return "Informe um e-mail ou usuário de até 254 caracteres."
  if (typeof password !== "string" || !password.length || password.length > 128)
    return "Informe uma senha de até 128 caracteres."
  if (!register) return ""
  const username = typeof payload.usuario === "string" ? payload.usuario.trim() : ""
  if (username.length < 3 || username.length > 32)
    return "Usuário deve ter entre 3 e 32 caracteres."
  if (!/^[a-z0-9._-]+$/i.test(username))
    return "Usuário deve usar apenas letras, números, ponto, hífen ou sublinhado."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return "E-mail inválido."
  if (password.length < 6 || !/\p{L}/u.test(password) || !/\p{N}/u.test(password))
    return "Senha deve ter de 6 a 128 caracteres, com letras e pelo menos um número."
  return ""
}
