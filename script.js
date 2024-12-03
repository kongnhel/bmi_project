class BMICalculator {
    constructor() {
        this.weight = 0;
        this.height = 0;
        this.bmiResult = 0;
        this.bmiCategory = '';
        this.bmiNeed = 0;
        this.bmiOver = 0;
        this.att = '';
    }

    calculateBMI() {
        if (this.weight > 0 && this.height > 0) {
            const heightInMeters = this.height / 100;
            this.bmiResult = this.weight / (heightInMeters * heightInMeters);
            this.bmiNeed = 18.5 - this.bmiResult;
            this.bmiOver = this.bmiResult - 25;

            this.setBMICategory();
        }
    }

    setBMICategory() {
        if (this.bmiResult < 16.0) {
            this.bmiCategory = 'ស្គមខ្លាំង';
            this.att = 'ព្យាយាមបរិភោគ អាហារដែលមានជីវជាតិ!';
        } else if (this.bmiResult < 18.5) {
            this.bmiCategory = 'ស្គម';
            this.att = 'ខំសុីបាយ តិចទៅ!';
        } else if (this.bmiResult < 25) {
            this.bmiCategory = 'ធម្មតា';
            this.att = 'មិនបាច់បន្ថែម បន្ថយទេល្មមហើយ';
        } else if (this.bmiResult < 30) {
            this.bmiCategory = 'លើសទម្ងន់';
            this.att = 'ព្យាយាមហាត់ប្រាណ!';
        } else if (this.bmiResult < 35) {
            this.bmiCategory = 'ធាត់កម្រិត ១';
            this.att = 'តមអាហារខ្លះ និងហាត់ប្រាណ​ ប្រយ័ត្នហានិភ័យ!';
        } else if (this.bmiResult < 40) {
            this.bmiCategory = 'ធាត់កម្រិត ២';
            this.att = 'ហានិភ័យ ត្រូវ​តមអាហារ និងហាត់ប្រាណ!';
        } else {
            this.bmiCategory = 'ធាត់កម្រិត ៣';
            this.att = 'ហានិភ័យកម្រិតធ្ងន់ ត្រូវតមអាហារ និងហាត់ប្រាណ!';
        }
    }

    resetForm() {
        this.weight = 0;
        this.height = 0;
        this.bmiResult = 0;
        this.bmiCategory = '';
        this.bmiNeed = 0;
        this.bmiOver = 0;
        this.att = '';
    }
}

const bmiCalculator = new BMICalculator();

document.getElementById('calculateBtn').addEventListener('click', () => {
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');

    bmiCalculator.weight = parseFloat(weightInput.value) || 0;
    bmiCalculator.height = parseFloat(heightInput.value) || 0;

    bmiCalculator.calculateBMI();

    if (bmiCalculator.bmiResult > 0) {
        document.getElementById('result').style.display = 'block';
        document.getElementById('bmiResult').textContent = bmiCalculator.bmiResult.toFixed(1);
        document.getElementById('bmiCategory').textContent = bmiCalculator.bmiCategory;
        document.getElementById('att').textContent = bmiCalculator.att;

        document.getElementById('bmiNeedContainer').style.display =
            bmiCalculator.bmiResult < 18.5 ? 'block' : 'none';
        document.getElementById('bmiNeed').textContent = bmiCalculator.bmiNeed.toFixed(1);

        document.getElementById('bmiOverContainer').style.display =
            bmiCalculator.bmiResult > 25 ? 'block' : 'none';
        document.getElementById('bmiOver').textContent = bmiCalculator.bmiOver.toFixed(1);
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    bmiCalculator.resetForm();
    document.getElementById('bmiForm').reset();
    document.getElementById('result').style.display = 'none';
});
