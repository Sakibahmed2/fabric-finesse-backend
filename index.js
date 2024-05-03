const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("styleSync");
    const collection = db.collection("users");
    const productsCollection = db.collection("products");
    const reviewsCollection = db.collection("reviews");
    const ordersCollection = db.collection("orders");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password, role } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({
        name,
        email,
        password: hashedPassword,
        role,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, role: user.role, userId: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    //create product
    app.post("/api/v1/products", async (req, res) => {
      const {
        image,
        title,
        rating,
        price,
        brand,
        description,
        sale,
        salePrice,
      } = req.body;
      const result = await productsCollection.insertOne({
        image,
        title,
        rating,
        price,
        brand,
        description,
        sale,
        salePrice,
      });

      res.status(201).json({
        success: true,
        message: "Products created successfully",
        data: result,
      });
    });

    //get all product
    app.get("/api/v1/products", async (req, res) => {
      const { category } = req.query;

      const filter = {};
      if (category) {
        filter.category = category;
      }

      try {
        const result = await productsCollection.find(filter).toArray();

        res.status(200).json({
          success: true,
          message: "Products retrieved successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve products",
          error: error.message,
        });
      }
    });

    //get single product
    app.get("/api/v1/products/:id", async (req, res) => {
      const { id } = req.params;

      const query = { _id: new ObjectId(id) };

      const result = await productsCollection.findOne(query);

      res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: result,
      });
    });

    //create reviews
    app.post("/api/v1/reviews", async (req, res) => {
      const { review, productId, userName } = req.body;
      const result = await reviewsCollection.insertOne({
        review,
        productId,
        userName,
      });

      res.status(200).json({
        success: true,
        message: "Review posted successfully",
        data: result,
      });
    });

    // get reviews by product id
    app.get("/api/v1/reviews/:productId", async (req, res) => {
      const { productId } = req.params;

      try {
        const result = await reviewsCollection
          .find({ productId: productId })
          .toArray();
        res.status(201).json({
          success: true,
          message: "Reviews retrieved successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //create orders
    app.post("/api/v1/orders", async (req, res) => {
      try {
        const orderData = req.body;

        orderData.createdAt = new Date();

        const result = await ordersCollection.insertOne(orderData);

        res.status(200).json({
          success: true,
          message: "Order placed successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //get all orders
    app.get("/api/v1/orders", async (req, res) => {
      try {
        const result = await ordersCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "Order retrieved successfully",
          data: result,
        });
      } catch (err) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //get user order
    app.get("/api/v1/orders/:userId", async (req, res) => {
      const { userId } = req.params;
      try {
        const result = await ordersCollection
          .find({ userId: userId })
          .toArray();
        res.status(200).json({
          success: true,
          message: "Order retrieved successfully",
          data: result,
        });
      } catch (err) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //update order status
    app.patch("/api/v1/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "delivered",
          },
        };
        const result = await ordersCollection.updateOne(filter, updateDoc);

        res.status(200).json({
          success: true,
          message: "Status updated successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
