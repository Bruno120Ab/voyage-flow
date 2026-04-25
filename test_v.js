import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8').split('\n')
const getEnv = (key) => env.find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'))

async function test() {
  const { data } = await supabase.from('veiculos').select('placa, modelo')
  console.log(data)
}
test()
