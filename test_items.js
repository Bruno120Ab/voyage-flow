import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/)
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1])
  supabase.from("embarques").select("*").then(({ data, error }) => {
    if(error) console.error(error)
    else {
      let crashes = false;
      data.forEach(e => {
        try {
          const d = new Date(e.data_saida);
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        } catch (err) {
          console.error("CRASH ON ITEM", e, err.message)
          crashes = true;
        }
      })
      if(!crashes) console.log("No items crash on Date formatting.")
    }
  })
} else {
  console.log("No env")
}
