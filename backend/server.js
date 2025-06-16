import express from "express";
import dotenv from 'dotenv'
import { sql } from "./config/db.js";

dotenv.config();


const app = express();

app.use(express.json())

// app.use((req, res, next)=> {
//     console.log("Hey we hit a req, the method is", req.method);
//     next();
// })

const PORT = process.env.PORT || 5001;

async function initDB(){
    try{
        await sql`CREATE TABLE IF NOT EXISTS transaction(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) not null,
            category VARCHAR(255) NOT NULL,
            created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`;
        console.log("Database initialized successfuly")
    } catch(error){
        console.log("Error initializing DB", error)
        process.exit(1)
    }
}

app.get("/", (req, res) => {
    res.send("its working");
})

app.get("/api/transactions/:userId", async(req,res)=> {
    try {
        const {userId}=req.params;
        const transactions = await sql `
            SELECT * FROM transaction WHERE user_id = ${userId} ORDER BY created_at DESC
        `

        res.status(200).json(transactions);
    } catch (error) {
        console.log("Error getting the transaction", error)
        res.status(500).json({message:"Internal server Error"})
    }
})

app.post("/api/transactions", async (req, res) => {
    try{
        const {title, amount, category, user_id} = req.body

        if(!title || !user_id || !category || amount === undefined){
            return res.status(400).json({message: "All fields are required"});
        }

        const transaction = await sql`
            INSERT INTO transaction(user_id,title,amount,category)
            VALUES (${user_id},${title},${amount},${category})
            RETURNING *
        `
        console.log(transaction);
        res.status(201).json(transaction[0])

    } catch(error){
        console.log("Error creating the transaction", error)
        res.status(500).json({message:"Internal server Error"})
    }
})

app.delete("/api/transactions/:id", async (req,res)=>{
    try {
        const {id} = req.params;

        if(isNaN(parseInt(id))){
            return res.status(400).json({message:"Invalid transaction ID"})
        }

        const result = await sql `
            DELETE FROM transaction WHERE id = ${id} RETURNING *
        `

        if(result.length === 0){
            return res.status(404).json({message:"Transaction not found"})
        }

        res.status(200).json({message:"Transaction deleted successfully"})
    } catch (error) {
        console.log("Error deleting the transaction", error)
        res.status(500).json({message:"Internal server Error"})
    }
})

app.get("/api/transactions/summary/:userId", async(req, res) => {
    try {
        const {userId} = req.params;

        const balanceResult = await sql`
            SELECT COALESCE(SUM(amount),0) as balance FROM transaction WHERE user_id = ${userId}
        `

        const incomeResult = await sql `
            SELECT COALESCE(SUM(amount),0) as income FROM transaction
            WHERE user_id = ${userId} AND amount > 0
        `

        const expensiveResult = await sql `
            SELECT COALESCE(SUM(amount),0) as expensive FROM transaction
            WHERE user_id = ${userId} AND amount < 0
        `

        res.status(200).json({
            balance: balanceResult[0].balance,
            income: incomeResult[0].income,
            expensive: expensiveResult[0].expensive,
            
        })

    } catch (error) {
        console.log("Error getting the summary", error)
        res.status(500).json({message:"Internal server Error"})
    }
})

initDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server is up and running on PORT:", PORT);
    });
});


