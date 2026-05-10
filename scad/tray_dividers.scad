// Parametric Tray Dividers for Warhammer Bases
// Generated for the Blank Shelf

/* [Base Settings] */
// Pass a list of slots here to mix sizes natively! e.g. [25, 25, 32, 40]
slot_diameters = [];

// Diameter of the bases you want to hold (in mm) (Fallback if slot_diameters is empty)
base_diameter = 32; 

// Height of the bevel on the base (in mm)
base_bevel_height = 5;

// The angle of the base edge from vertical (Warhammer standard is usually 15-20, measure yours to get exact fit)
base_angle = 15;

/* [Clearances & Barriers] */
// Extra width added to the slot so bases slide easily
clearance = 0.5;

// Width of the dividing walls between each base slot
barrier_width = 1.0;

// Barrier thickness at the back of the tray
back_barrier_width = 3;

// Gap at the open side (front of the tray) to make racks shorter
front_gap = 5;

/* [Shelf Dimensions] */
// Depth of the tray/shelf (from front to back)
shelf_depth = 140;

// Maximum available width of the tray
max_shelf_width = 217.7;

/* [Generation] */
// Number of slots. If -1, it will auto-calculate standard slots. (Fallback if slot_diameters is empty)
number_of_slots = -1; 

// Base connecting plate thickness (0 means separate rails connected only at the back, just like the image)
base_plate_thickness = 0;

// Merge the generated dividers physically with the Blank Shelf base?
merge_shelf = false;

// Offset to precisely perfectly the fusion (e.g. 0 sets floor at middle, 0.1 shifts shelf up)
shelf_z_offset = 0.1;

/* [Hidden] */
$fn = 32;

// Auto-calculate slots if using legacy mode
eff_dia = base_diameter + clearance;
slot_width = eff_dia + barrier_width;
n_slots_auto = floor((max_shelf_width - barrier_width) / slot_width);
n_slots_legacy = (number_of_slots > 0) ? number_of_slots : n_slots_auto;

// Identify active slots
active_slots = (len(slot_diameters) > 0) ? slot_diameters : [for (i=[1:n_slots_legacy]) base_diameter];
n_active = len(active_slots);

// Cumulative mathematical summing for mixed widths
function sum_dia(arr, end_idx, c) = 
    (end_idx < 0) ? 0 : 
    (arr[end_idx] + c) + sum_dia(arr, end_idx - 1, c);

function get_x_pos(slots, i, barrier, c) = 
    (i + 1) * barrier + sum_dia(slots, i - 1, c) + (slots[i] + c) / 2;

// Total exact width of the final plate based on the dynamic barriers
total_width = sum_dia(active_slots, n_active - 1, clearance) + (n_active + 1) * barrier_width;

module slot_negative_for(dia) {
    r1 = (dia + clearance) / 2;
    slot_length = shelf_depth - back_barrier_width - r1;
    z_shift = -0.5;
    r1_eff = r1 - z_shift * tan(base_angle);
    
    // Extrude slightly taller than base height for clean subtraction
    h_eff = base_bevel_height + 1.0;
    r2_eff = r1_eff - h_eff * tan(base_angle);
    
    translate([0, 0, z_shift]) {
        hull() {
            translate([0, slot_length, 0]) cylinder(h=h_eff, r1=r1_eff, r2=r2_eff);
            translate([0, -1, 0]) cylinder(h=h_eff, r1=r1_eff, r2=r2_eff);
        }
    }
}

module dividers() {
    difference() {
        // Build the solid body with the stepped front
        union() {
            // Main body for center sections
            if (n_active > 0) {
                translate([barrier_width, front_gap, 0])
                    cube([total_width - 2*barrier_width, shelf_depth - front_gap, base_bevel_height]);
            }
            
            // End walls (10mm recessed)
            translate([0, front_gap + 10, 0])
                cube([barrier_width, shelf_depth - (front_gap + 10), base_bevel_height]);
            translate([total_width - barrier_width, front_gap + 10, 0])
                cube([barrier_width, shelf_depth - (front_gap + 10), base_bevel_height]);
        }
        
        // Subtract the mixed base channels sequentially
        for(i = [0 : n_active - 1]) {
            x_pos = get_x_pos(active_slots, i, barrier_width, clearance);
            translate([x_pos, 0, 0])
                slot_negative_for(active_slots[i]);
        }
    }
    
    // Apply optional base plate bottom if needed
    if (base_plate_thickness > 0) {
        translate([0, front_gap, -base_plate_thickness])
            cube([total_width, shelf_depth - front_gap, base_plate_thickness]);
    }
}

// Generate the item centered on the X origin to match many slicing workflows.
if (merge_shelf) {
    union() {
        translate([-total_width/2, 0, 0])
            dividers();
        
        // Aligning the Blank shelf.stl (which is naturally standing on Z with its thickness on Y)
        // by rotating the other way to bed and translating so its top surface sits flush at Z=0.
        translate([0, 72.3, shelf_z_offset])
            rotate([90, 0, 0])
            import("Blank shelf.stl");
    }
} else {
    translate([-total_width/2, 0, 0])
        dividers();
}
