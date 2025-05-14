import { Invoice } from "@/models";
import { Request, Response } from "express";
import { sleep } from "../utils"
import { Express } from "express-serve-static-core";

export function InvoiceRoutes(app: Express) {
  app.get("/invoices", async (req: Request, res: Response) => {
    const { page = "1", query = "", limit = "10" } = req.query as {
      page: string;
      query?: string;
      limit?: string;
    };

    const ITEMS_PER_PAGE = Number(limit);
    const currentPage = Number(page) || 1;
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    if (offset < 0) {
      return res.status(400).json({ message: "Invalid page number." });
    }

    await sleep(5)

    try {
      const filterQuery = [
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            $or: [
              { "customer.name": { $regex: query, $options: "i" } },
              { "customer.email": { $regex: query, $options: "i" } },
              { amount: { $regex: query, $options: "i" } },
              { date: { $regex: query, $options: "i" } },
              { status: { $regex: query, $options: "i" } },
            ],
          },
        },
      ];
      const pipeline = [
        ...filterQuery,
        {
          $project: {
            _id: 0,
            id: "$_id",
            amount: 1,
            date: 1,
            status: 1,
            name: "$customer.name",
            email: "$customer.email",
            image_url: "$customer.image_url",
          },
        },
        {
          $sort: { date: -1 },
        },
        {
          $skip: offset,
        },
        {
          $limit: ITEMS_PER_PAGE,
        },
      ] as any[];

      const invoices = await Invoice.aggregate(pipeline);
      const totalItems = await Invoice.aggregate([
        ...filterQuery,
        { $count: "total"}
      ])
      console.log("totalItems", totalItems)
      const total = totalItems.length ? totalItems[0].total : invoices.length
      res.status(200).json({
        data: invoices,
        totalPages: Math.ceil(total/ITEMS_PER_PAGE)
      });
    } catch (error: any) {
      console.error("Database Error:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch invoices.", error: error.message });
    }
  });
}
