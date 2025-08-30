import React, { useState, useEffect, useRef } from "react";
import "./SpinWheel.css";

interface WheelSlot {
  id: number;
  name: string;
  value: number;
  type: "eth" | "gm";
  color: string;
}

interface SpinWheelProps {
  isSpinning: boolean;
  onSpinComplete: (result: string) => void;
  onSpin: () => void;
  slots: WheelSlot[] | string[];
  canSpin: boolean;
  targetSlotIndex?: number | null;
  onBlockedSpin?: () => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  isSpinning,
  onSpinComplete,
  onSpin,
  slots,
  canSpin,
  targetSlotIndex = null,
  onBlockedSpin,
}) => {
  const [rotation, setRotation] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Helper function to get slot display info
  const getSlotInfo = (slot: WheelSlot | string, index: number) => {
    if (typeof slot === "string") {
      return {
        name: slot,
        value: `${index + 1}`,
        type: "gm" as const,
        color: index % 2 === 0 ? "#4a90e2" : "#357abd",
      };
    }

    // ✅ Return đúng thông tin theo slot thực tế
    return {
      name: slot.name,
      value: slot.value, // ✅ Giữ nguyên value số
      type: slot.type,
      color: slot.color,
    };
  };

  // ✅ Guard để tránh multiple spins
  const [hasSpunThisRound, setHasSpunThisRound] = useState(false);

  // Enhanced spinning logic - chỉ chạy khi có contract result
  useEffect(() => {
    // Removed debug log for spinning useEffect

    // ✅ Chỉ bắt đầu animation khi isSpinning được set từ App.tsx sau transaction
    if (isSpinning && !isAnimating && !hasSpunThisRound) {
      // Removed debug logs for spin animation start

      setIsAnimating(true);
      setHasSpunThisRound(true);
      setSpinCount((prev) => prev + 1);

      // Calculate final position: use target if provided, else random
      const slotIndex = targetSlotIndex != null ? targetSlotIndex : Math.floor(Math.random() * slots.length);

      // Aim the CENTER of the target segment to the pointer at top
      const segmentDeg = 360 / slots.length;
      const targetCenter = slotIndex * segmentDeg + segmentDeg / 2; // deg
      // Rotate wheel so targetCenter aligns to pointer (top). Because wheel rotates clockwise,
      // bring the target's center to 0deg by rotating (360 - targetCenter)
      // Ensure clockwise motion every time by choosing a target angle strictly greater than current angle
      const currentTurns = Math.floor(rotation / 360);
      const extraTurns = 10 + Math.floor(Math.random() * 5); // 10-14 extra turns
      const targetTurns = currentTurns + extraTurns;
      const finalRotation = targetTurns * 360 + (360 - targetCenter);

      // Removed debug log for final rotation

      // Debug mapping color/slot
      const normalized = ((rotation % 360) + 360) % 360;
      const currentIndex = Math.floor(((360 - normalized) % 360) / segmentDeg);
      const currentInfo = getSlotInfo(slots[currentIndex], currentIndex);
      const targetInfo = getSlotInfo(slots[slotIndex], slotIndex);

      setRotation(finalRotation);
      setSelectedSlot(slotIndex);

      // Animation duration
      const animationDuration = 5000; // 5 seconds

      setTimeout(() => {
        const slotInfo = getSlotInfo(slots[slotIndex], slotIndex);
        // Removed debug logs for animation completion

        // ✅ Chỉ gọi onSpinComplete nếu có targetSlotIndex (từ contract)
        if (onSpinComplete && targetSlotIndex !== null) {
          const resultWithDetails = {
            slotIndex,
            slotName: slotInfo.name,
            slotValue: slotInfo.value,
            slotType: slotInfo.type,
            result: `${slotInfo.name} ${slotInfo.value}`,
          };
          onSpinComplete(JSON.stringify(resultWithDetails));
        }

        setIsAnimating(false);
      }, animationDuration);
    }
  }, [isSpinning, isAnimating, hasSpunThisRound, targetSlotIndex, rotation, slots.length]);

  // ✅ Reset guard khi không spin nữa
  useEffect(() => {
    if (!isSpinning) {
      setHasSpunThisRound(false);
    }
  }, [isSpinning]);

  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: isAnimating ? `transform 5s cubic-bezier(0.25, 0.46, 0.45, 0.94)` : "none",
  };

  return (
    <div className="wheel-container">
      <div className="pointer"></div>

      <div className="wheel" ref={wheelRef} style={wheelStyle}>
        <svg className="wheel-svg" viewBox="0 0 320 320">
          {/* ✅ Dynamic segments based on WHEEL_SLOTS */}
          {slots.map((slot, index) => {
            const slotInfo = getSlotInfo(slot, index);
            const angle = (360 / slots.length) * index;
            const startAngle = angle;
            const endAngle = angle + 360 / slots.length;

            // Calculate path coordinates
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 160 + 160 * Math.cos(startRad);
            const y1 = 160 + 160 * Math.sin(startRad);
            const x2 = 160 + 160 * Math.cos(endRad);
            const y2 = 160 + 160 * Math.sin(endRad);

            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            const pathData = `M 160,160 L ${x1},${y1} A 160,160 0 ${largeArcFlag},1 ${x2},${y2} Z`;

            // Calculate text position
            const textAngle = angle + 360 / slots.length / 2;
            const textRad = (textAngle - 90) * (Math.PI / 180);
            const textX = 160 + 120 * Math.cos(textRad);
            const textY = 160 + 120 * Math.sin(textRad);

            // Get icon and text based on slot type
            const getIconAndText = () => {
              if (slotInfo.name === "ETH") {
                return { icon: "◊", text: slotInfo.value.toString() };
              } else if (slotInfo.name === "GM" && Number(slotInfo.value) > 0) {
                return { icon: "🪙", text: slotInfo.value.toString() };
              } else {
                return { icon: "❌", text: "" };
              }
            };

            const { icon, text } = getIconAndText();

            return (
              <g key={index}>
                <path className="segment-path" d={pathData} fill={slotInfo.color} data-segment={index} />
                <text
                  className="segment-text"
                  x={textX}
                  y={textY}
                  transform={`rotate(${textAngle} ${textX} ${textY})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan className="segment-icon" x={textX} dy="-10" fontSize="20">
                    {icon}
                  </tspan>
                  {text && (
                    <tspan x={textX} dy="25" fontSize="16" fontWeight="bold">
                      {text}
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <button
        className="center-button"
        onClick={() => {
          // Removed debug logs for spin button click

                      if (!canSpin) {
              onBlockedSpin?.();
              return;
            }

                      if (isSpinning || isAnimating) {
              return;
            }

                      onSpin(); // Chỉ gọi transaction, KHÔNG bắt đầu animation ngay
        }}
        disabled={isSpinning || isAnimating}
      >
        {isSpinning || isAnimating ? "Spinning..." : "Spin"}
      </button>
    </div>
  );
};
