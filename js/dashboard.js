
const SUPABASE_URL="https://yymbsueuqglzikfshenn.supabase.co";
const SUPABASE_KEY="sb_publishable_1vd_-hZR6wqilx39E-W8BA_fx9THigQ";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

async function carregar(){
 const {data}=await client.from("respostas").select("*");
 const total=data?.length||0;
 const media=total? (data.reduce((a,b)=>a+b.pontuacao,0)/total).toFixed(2):0;

 document.getElementById("participantes").textContent=total;
 document.getElementById("media").textContent=media + " / 7";
}
carregar();
