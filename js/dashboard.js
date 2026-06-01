
const SUPABASE_URL="COLOCAR_URL";
const SUPABASE_KEY="COLOCAR_CHAVE";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

async function carregar(){
 const {data}=await client.from("respostas").select("*");
 const total=data?.length||0;
 const media=total? (data.reduce((a,b)=>a+b.pontuacao,0)/total).toFixed(2):0;

 document.getElementById("participantes").textContent=total;
 document.getElementById("media").textContent=media + " / 7";
}
carregar();
