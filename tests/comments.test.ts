import { computeAntiSpamScore } from "@/services/comments"

describe("computeAntiSpamScore", () => {
	it("penalizes links and shouting", () => {
		const score = computeAntiSpamScore("CHECK THIS OUT!!!!! https://spam.example.com")
		expect(score).toBeGreaterThanOrEqual(3)
	})

	it("keeps normal comments low", () => {
		expect(computeAntiSpamScore("這是一則正常的評論。")).toBeLessThan(2)
	})
})
